create or replace function preview_trade_cost(
  p_market uuid,
  p_option uuid,
  p_shares_delta numeric
)
returns numeric
language sql
stable
as $$
  with current_state as (
    select
      option_id,
      shares
    from amm_state
    where market_id = p_market
  ),
  params as (
    select b from markets where id = p_market
  ),
  before_cost as (
    select
      -- Wrapping b in max() tells PG it's safe to use with sum()
      max(b) * ln(sum(exp(shares / b))) as cost
    from current_state
    cross join params
    group by b -- Added group by to satisfy the parser
  ),
  after_cost as (
    select
      max(b) * ln(
        sum(
          exp(
            (shares +
              case
                when option_id = p_option
                then p_shares_delta
                else 0
              end
            ) / b
          )
        )
      ) as cost
    from current_state
    cross join params
    group by b -- Added group by here as well
  )
  select after_cost.cost - before_cost.cost
  from before_cost, after_cost;
$$;

comment on function preview_trade_cost(uuid, uuid, numeric)
is 'Preview LMSR trade cost without mutating AMM state';
