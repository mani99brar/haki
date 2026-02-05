-- Enable extensions
create extension if not exists "pgcrypto";

--------------------------------------------------
-- 1. Profiles
--------------------------------------------------
create table profiles (
  wallet_address text primary key,
  ens_name text,
  display_name text,
  is_ai boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

--------------------------------------------------
-- 2. Markets
--------------------------------------------------
create table markets (
  id uuid primary key default gen_random_uuid(),
  creator_wallet text references profiles(wallet_address),
  question text not null,
  description text,
  topic text,
  status text check (status in ('draft','open','closed','resolved')) default 'draft',
  b numeric not null default 50,
  created_at timestamptz default now(),
  opens_at timestamptz,
  closes_at timestamptz
);

--------------------------------------------------
-- 3. Options
--------------------------------------------------
create table options (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references markets(id) on delete cascade,
  label text not null,
  "index" int not null,
  created_at timestamptz default now(),
  unique (market_id, "index")
);

--------------------------------------------------
-- 4. AMM State (canonical LMSR shares)
--------------------------------------------------
create table amm_state (
  market_id uuid references markets(id) on delete cascade,
  option_id uuid references options(id) on delete cascade,
  shares numeric not null default 0,
  primary key (market_id, option_id)
);

create index on amm_state (market_id);

--------------------------------------------------
-- 5. Trades (event log, off-chain)
--------------------------------------------------
create table trades (
  id uuid primary key default gen_random_uuid(),
  wallet_address text references profiles(wallet_address),
  market_id uuid references markets(id),
  option_id uuid references options(id),
  shares_delta numeric not null,
  cost numeric not null,
  price_at_trade numeric not null,
  signed_payload jsonb not null,
  signature text not null,
  signature_verified boolean default false,
  created_at timestamptz default now()
);

--------------------------------------------------
-- 6. Resolutions
--------------------------------------------------
create table resolutions (
  market_id uuid primary key references markets(id),
  winning_option_id uuid references options(id),
  resolved_at timestamptz default now(),
  resolved_by text
);

--------------------------------------------------
-- 7. Payouts
--------------------------------------------------
create table payouts (
  id uuid primary key default gen_random_uuid(),
  wallet_address text references profiles(wallet_address),
  market_id uuid references markets(id),
  amount numeric not null,
  paid boolean default false,
  created_at timestamptz default now()
);

--------------------------------------------------
-- 8. Atomic LMSR Trade Function
--------------------------------------------------
create or replace function execute_trade(
  p_wallet text,
  p_market uuid,
  p_option uuid,
  p_shares_delta numeric,
  p_signed_payload jsonb,
  p_signature text
)
returns table (
  trade_id uuid,
  cost numeric,
  price numeric
)
language plpgsql
as $$
declare
  b numeric;
  old_cost numeric;
  new_cost numeric;
  price numeric;
begin
  -- Lock market row
  select m.b
  into b
  from markets m
  where m.id = p_market
  for update;

  -- Lock AMM state rows for this market
  perform 1
  from amm_state
  where market_id = p_market
  for update;

  -- Compute old LMSR cost
  select b * ln(sum(exp(shares / b)))
  into old_cost
  from amm_state
  where market_id = p_market;

  -- Update shares for chosen option
  update amm_state
  set shares = shares + p_shares_delta
  where market_id = p_market
    and option_id = p_option;

  -- Compute new LMSR cost
  select b * ln(sum(exp(shares / b)))
  into new_cost
  from amm_state
  where market_id = p_market;

  cost := new_cost - old_cost;

  -- Compute instantaneous price
  select
    exp(shares / b) / sum(exp(shares / b)) over ()
  into price
  from amm_state
  where market_id = p_market
    and option_id = p_option;

  -- Insert trade log
  insert into trades (
    wallet_address,
    market_id,
    option_id,
    shares_delta,
    cost,
    price_at_trade,
    signed_payload,
    signature,
    signature_verified
  )
  values (
    p_wallet,
    p_market,
    p_option,
    p_shares_delta,
    cost,
    price,
    p_signed_payload,
    p_signature,
    true
  )
  returning id into trade_id;

  return query select trade_id, cost, price;
end;
$$;
