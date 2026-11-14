# Tarefas

- [ ] Validar a migração `20261114001000_atomic_queue_match.sql` contra o banco real.
- [ ] Corrigir apenas a ambiguidade do `RETURNING`, com alias e colunas qualificadas.
- [ ] Aplicar a migração somente se todas as validações forem compatíveis.
- [ ] Confirmar `public.claim_queue_entry(uuid)` e seu retorno por consulta real.
- [ ] Executar lint, testes unitários, build de produção e E2E responsivo.
- [ ] Corrigir somente erros reproduzíveis e informar resultados ou bloqueios.
