--------------------------------------------------
-- Add frontend-facing LMSR option metadata function
--------------------------------------------------

create or replace function get_market_options(
  p_market uuid
)
returns table (
  option_id uuid,
  label text,
  option_index int,
  shares numeric,
  probability numeric,
  marginal_price numeric
)
language sql
stable
as $$
  with exp_terms as (
    select
      o.id as option_id,
      o.label,
      o."index" as option_index,
      a.shares,
      exp(a.shares / m.b) as exp_q
    from options o
    join amm_state a
      on a.option_id = o.id
     and a.market_id = o.market_id
    join markets m
      on m.id = o.market_id
    where o.market_id = p_market
  )
  select
    option_id,
    label,
    option_index,
    shares,
    exp_q / sum(exp_q) over () as probability,
    exp_q / sum(exp_q) over () as marginal_price
  from exp_terms
  order by option_index;
$$;

comment on function get_market_options(uuid)
is 'Returns LMSR-derived option probabilities and prices for frontend consumption';
