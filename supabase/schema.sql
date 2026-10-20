create extension if not exists pgcrypto;
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 order_number text unique not null,
 customer_name text not null,
 email text not null,
 phone text not null,
 delivery_address text not null,
 city text not null,
 payment_method text not null check(payment_method in ('cod','online')),
 payment_status text not null default 'pending' check(payment_status in ('pending','paid','failed','refunded')),
 order_status text not null default 'pending' check(order_status in ('pending','confirmed','processing','shipped','completed','cancelled')),
 total_amount integer not null check(total_amount>0),
 items jsonb not null,
 payment_reference text,
 created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
