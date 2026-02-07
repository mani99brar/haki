create or replace function get_user_positions(
  p_wallet text,
  p_market uuid
)
returns table (
  option_id uuid,
  shares numeric
)
language sql
stable
as $$
  select
    option_id,
    sum(shares_delta) as shares
  from trades
  where wallet_address = p_wallet
    and market_id = p_market
  group by option_id
  having sum(shares_delta) <> 0;
$$;

comment on function get_user_positions(text, uuid)
is 'Net shares held by a user per option in a market';

create or replace function get_user_cost_basis(
  p_wallet text,
  p_market uuid
)
returns table (
  option_id uuid,
  net_shares numeric,
  net_cost numeric,
  avg_price numeric
)
language sql
stable
as $$
  select
    option_id,
    sum(shares_delta) as net_shares,
    sum(cost) as net_cost,
    case
      when sum(shares_delta) <> 0
      then sum(cost) / sum(shares_delta)
      else null
    end as avg_price
  from trades
  where wallet_address = p_wallet
    and market_id = p_market
  group by option_id;
$$;

comment on function get_user_cost_basis(text, uuid)
is 'User net shares, total cost, and average entry price per option';

create or replace function get_user_unrealized_pnl(
  p_wallet text,
  p_market uuid
)
returns table (
  option_id uuid,
  shares numeric,
  cost numeric,
  current_price numeric,
  position_value numeric,
  unrealized_pnl numeric
)
language sql
stable
as $$
  with positions as (
    select
      option_id,
      sum(shares_delta) as shares,
      sum(cost) as cost
    from trades
    where wallet_address = p_wallet
      and market_id = p_market
    group by option_id
  ),
  prices as (
    select
      option_id,
      marginal_price
    from get_market_options(p_market)
  )
  select
    p.option_id,
    p.shares,
    p.cost,
    pr.marginal_price as current_price,
    p.shares * pr.marginal_price as position_value,
    (p.shares * pr.marginal_price) - p.cost as unrealized_pnl
  from positions p
  join prices pr using (option_id);
$$;

comment on function get_user_unrealized_pnl(text, uuid)
is 'Mark-to-market unrealized PnL for a user in a market';

create or replace function get_user_market_pnl(
  p_wallet text,
  p_market uuid
)
returns table (
  total_cost numeric,
  total_value numeric,
  unrealized_pnl numeric
)
language sql
stable
as $$
  select
    sum(cost) as total_cost,
    sum(position_value) as total_value,
    sum(unrealized_pnl) as unrealized_pnl
  from get_user_unrealized_pnl(p_wallet, p_market);
$$;

comment on function get_user_market_pnl(text, uuid)
is 'Aggregate unrealized PnL for a user in a market';
