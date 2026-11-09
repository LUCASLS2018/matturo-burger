# Matturo Burger

- [x] Informar o custo de referência para percursos rodoviários: Google Routes Essentials, 10 000 cálculos gratuitos/mês e US$ 5 por 1 000 adicionais na primeira faixa; ligação e condições de faturação ainda não escolhidas.

- [ ] Usar distância pelo percurso rodoviário nas faixas de entrega e portes, sem fallback em linha reta — aguarda autorização para ligar um serviço de rotas adequado a pedidos comerciais; serviços públicos de demonstração não garantem disponibilidade.
- [x] Retirar Comer no local das modalidades disponíveis para novos pedidos, preservando o histórico; seis testes e verificação no carrinho passaram.

- [x] Bloquear pedidos fora do horário publicado e mostrar FECHADO no site público, usando Europe/Lisbon e validação no servidor; 88 testes e verificação visual pública passaram.
- [x] Adicionar configuração de entregas e preços por raio calculado a partir da morada da loja; 98 testes, cálculo real de distância e compilação passaram. Falta ao dono configurar/ativar as suas faixas.
- [x] Permitir pedidos agendados fora do horário, com data/hora futura dentro do funcionamento e aceitação apenas depois da loja abrir; 105 testes e validação visual móvel/desktop passaram. Não foi criado um pedido real de teste.
- [x] Tornar o fecho por imprevisto mais evidente: botão «Fechar agora» nas configurações e FECHADO no site mesmo dentro do horário; testes do estado público passaram.

- [x] Daily order numbering from 1, restarting at Lisbon midnight: isolated atomic counter, historical backfill and shared display; 17 tests and transactional insert/retry/cancellation checks passed. Authenticated admin visual check remains unavailable with external Supabase.

- [x] Show original product photographs grouped by categories in the manual admin order form.

- [ ] Guest loyalty redemption: awaiting approval of telephone-ownership confirmation and isolated transactional debit changes; telephone alone cannot authorize spending another customer's points.
- [ ] Add secure guest telephone confirmation, private balance and reward flow; atomically debit on order submission and restore on cancellation. Await SMS availability and architecture approval.
- [x] Automatically associate every customer's eligible order points to the checkout telephone; no registration or manual enrollment. Admin aggregation includes historical guest orders; six loyalty tests passed.

- [x] Present and obtain approval for the complete Matturo management architecture: onsite orders, live order administration, autosaved catalogue/categories, courier assignment, customer access and restaurant pause controls.
- [x] Create isolated restaurant settings and zone resources and administration page with revision-checked persistence; preserve existing catalogue and ordering channel until the order stage.
- [x] Owner activated both delivery zones (2600 → 3,00 €, 1111 → 4,00 €) and wired checkout to charge the matched zone fee, block delivery outside active zones and carry the fee into the order text.
- [x] Verify settings controls signed in as the authorized administrator: owner added, priced and activated both delivery zones and the live checkout reads them.
- [ ] Implement catalogue/order/dispatch/customer stages after first-stage verification; delivery activation also requires actual zone prefixes and fees.
- [x] Extract and verify original identity, photographs, menu and business information: 54 products, 6 categories, 41 customized dishes.
- [x] Replace NovaFix pages and navigation with restaurant home, menu, product details, cart, service and contacts.
- [x] Keep Matturo cart separate; direct order completion to original restaurant WhatsApp without using NovaFix Stripe or Supabase.
- [x] Verify real product selection, extras, quantities, cart editing, search, WhatsApp order text without sending, and mobile layout; tests passed.
- [x] Identify unavailable business information: retain website address; embedded Google listing differs. Onsite online ordering is disabled; confirm in-person conditions with restaurant. Products without photos remain without invented images.
- [x] Follow the newly uploaded visual reference while keeping original restaurant product photographs.
- [x] Remove the background of the large homepage burger.
- [x] Restyle every hamburger selection card to match the new compact reference, with original burger cutouts and functional controls.
- [x] Keep all ordering buttons on this site instead of the discontinued external menu.
- [x] Match the latest horizontal compact burger-card layout with original product photos.
- [x] Apply the same compact layout to pizzas using original photos.
- [x] Remove photographic backgrounds from all original pizza photos.
- [x] Apply the compact ordering layout to every product and remove backgrounds from all remaining available photos; products without original photos retain a neutral icon.
- [x] Ensure all product names remain fully separated from photos; verified at mobile, desktop and wide desktop sizes.
- [x] Show all 54 products on the homepage, promotions first.
- [x] Make the transparent logo black and increase its visible size further; verified on mobile and desktop.
- [x] Add Comer no local in cart and carry the selection into order completion; UI and order text verified.
- [x] Present GPS delivery architecture; approved with name/photo profiles.
- [x] Audit and create isolated Matturo delivery tables and private photo storage with authorization; anonymous privileged-function access revoked.
- [x] Implement authenticated courier/admin panels and token-based customer tracking; no payments or NovaFix data changes.
- [x] Assign first Matturo administrator to the confirmed account selected and explicitly authorized by the owner; administrator role verified by database readback.
- [ ] Verify authenticated GPS lifecycle, realtime, photo upload and map with distinct accounts; external Supabase authentication unavailable for automated sessions. Public access denial, invalid-token rejection and nine unit tests passed. Email auth settings remain unverified.
- [x] Management stage 2a: orders saved on the site (server-priced snapshots), customer status page, admin order centre with live updates and optional sound.
- [x] Add a visible team panel entry point: header "Painel" button and a /painel hub with pedidos, entregas and configurações areas (admin-only cards hidden for couriers).
- [x] Management stage 2b: link orders to courier assignment and deliveries automatically; cancelling an order cancels its active delivery, hides the courier position and revokes the tracking link.
- [x] Management stage 3: editable menu with autosave in the admin panel; owner verified the authenticated save flow end to end.
- [ ] Finish editable categories and modifier groups/options, including public ordering and revision-checked admin autosave.
- [ ] Owner requirement: every ingredient, stuffed-crust choice, modifier group, option price/limit/order and general catalogue detail must be editable in the admin panel, not only photos, prices and availability.
- [ ] Add customer accounts and an owner-scoped order history without exposing team areas or other customers' orders.
- [ ] Complete courier availability, assignment details and the full pickup/transit/completion state controls.
- [ ] Review and remediate the four outstanding legacy security findings without changing retired NovaFix data.
- [ ] Recheck the complete GPS lifecycle with distinct accounts and a real mobile permission flow; identify any step that still requires the owner.
- [x] Aba Clientes no painel (telemóvel, morada, últimos pedidos, total gasto) — aguarda verificação com a conta de administrador
- [x] Som de pedidos fica ligado até o admin desligar
- [ ] Avisos push no telemóvel do cliente (fora do site) quando o pedido muda de estado: código completo e verificado (botão na página do pedido, tabela isolada matturo_push_tokens só para o sistema, envio ao mudar estado do pedido ou da entrega, 6 testes novos, 64 no total, build OK). Falta apenas o dono terminar a ligação Firebase Cloud Messaging (JSON da conta de serviço + chave VAPID + app web); sem credenciais o botão fica escondido e nada é enviado.
- [x] Separar cada pedido pela origem (app, web ou telefone) e permitir filtrar a central de pedidos e os concluídos por origem. Coluna source na tabela de pedidos, origem detetada no envio e pedidos manuais marcados como telefone; 8 testes novos, build OK.
- [x] Aba na gestão de entregas com o resultado dia a dia: entregas feitas e valor por dia (incluindo dias anteriores), com detalhe por estafeta; 5 testes novos, build OK.
