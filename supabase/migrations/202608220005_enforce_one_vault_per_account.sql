-- One private vault per account.
-- Existing duplicated vault rows are merged into the oldest vault for each owner.
-- Documents and journeys remain attached to their owner’s retained vault.

with canonical_vaults as (
  select distinct on (owner_id) id, owner_id
  from public.vaults
  order by owner_id, created_at asc, id asc
)
update public.documents d
set vault_id = c.id
from canonical_vaults c
where d.owner_id = c.owner_id
  and d.vault_id <> c.id;

with canonical_vaults as (
  select distinct on (owner_id) id, owner_id
  from public.vaults
  order by owner_id, created_at asc, id asc
)
update public.journeys j
set vault_id = c.id
from canonical_vaults c
where j.owner_id = c.owner_id
  and j.vault_id <> c.id;

with canonical_vaults as (
  select distinct on (owner_id) id, owner_id
  from public.vaults
  order by owner_id, created_at asc, id asc
)
delete from public.vaults v
using canonical_vaults c
where v.owner_id = c.owner_id
  and v.id <> c.id;

alter table public.vaults
  add constraint vaults_one_vault_per_owner unique (owner_id);
