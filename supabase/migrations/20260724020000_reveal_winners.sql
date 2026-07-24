-- Bandera para que el facilitador controle el momento en que se revela el
-- podio final (semana 5), en vez de mostrarlo apenas se cierra la última
-- semana.
alter table public.sessions
  add column if not exists winners_revealed boolean not null default false;
