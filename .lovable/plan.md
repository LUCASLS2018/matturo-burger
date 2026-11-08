# Rastreamento de entregas — Matturo Burger

## O que será criado
- **Restaurante:** painel protegido para confirmar pedidos, criar entregas, atribuir entregadores e consultar entregas ativas e histórico de estados. Como o pedido atual vai por WhatsApp, a primeira versão permite registar manualmente o pedido confirmado, sem pagamentos.
- **Entregador:** acesso individual, perfil com nome e foto, lista de entregas atribuídas, botões “Iniciar entrega” e “Finalizar entrega”. Só a entrega confirmada e iniciada poderá transmitir GPS, após permissão do dispositivo.
- **Cliente:** link exclusivo com mapa, destino, posição do entregador, estado e hora da última atualização. A posição desaparece ao terminar a entrega; uma ligação interrompida será indicada como localização desatualizada.
- **Mapa:** Leaflet com OpenStreetMap e atribuição visível, sem integração paga. Previsão de chegada fica indisponível inicialmente: não inventar tempos nem adicionar serviços de rotas pagos.

## Privacidade e limites
- Apenas o entregador atribuído pode atualizar a localização da entrega ativa; apenas administradores autorizados podem gerir entregas.
- Links de cliente não revelam outras entregas, contactos ou perfis completos. Expiram e podem ser revogados.
- Guardar apenas a posição GPS mais recente, apagando-a ao finalizar; conservar o histórico de estados sem trajetos GPS.
- GPS pelo navegador exige HTTPS e a página aberta. Não prometer rastreamento contínuo com o telemóvel bloqueado ou a aplicação em segundo plano; esta limitação será apresentada ao entregador.
- Não configurar Stripe, Klarna ou outros pagamentos. Não modificar nem reutilizar dados, tabelas ou integrações NovaFix.

## Estrutura técnica proposta
Recursos novos e isolados no Supabase já conectado:
- `matturo_profiles`: nome e referência da foto, ligados ao utilizador autenticado; criação automática de perfil sem privilégios administrativos.
- `matturo_user_roles`: permissões separadas dos perfis, nunca atribuídas por dados editáveis do utilizador.
- `matturo_deliveries`: referência do pedido confirmado, entregador, destino, estado e datas.
- `matturo_delivery_positions`: uma posição atual por entrega ativa, com precisão e instante de recolha.
- `matturo_delivery_events`: histórico de estados sem coordenadas.
- `matturo_tracking_links`: apenas hash de token aleatório forte, validade e revogação; token original no link do cliente.
- Armazenamento privado novo para fotos, com acesso limitado e URLs temporárias; não utilizar `product-images`.

Todas as tabelas novas terão permissões explícitas e RLS. Não haverá leitura pública das tabelas de entregas ou GPS. A autenticação utiliza Supabase Auth; o primeiro administrador será atribuído apenas à conta indicada pelo proprietário, após autorização, sem contas ou senhas fixas.

Operações internas usarão funções de servidor TanStack com verificação de identidade, papel e atribuição. Realtime será usado nos painéis autenticados com acesso restrito. Para o cliente sem conta, o servidor validará o token e devolverá somente os dados daquela entrega em consultas automáticas; não abrir tabelas GPS ao público para viabilizar Realtime. Não usar Supabase Edge Functions.

## Etapas e validação
1. Após aprovação, auditar o esquema e autenticação existentes somente por leitura; verificar conflitos antes de apresentar/aplicar a migração dos recursos novos.
2. Criar os recursos isolados e configurar acesso, fotos e atualizações em tempo real, com as autorizações necessárias.
3. Construir os três painéis e ligar confirmação, atribuição, início, atualização e conclusão.
4. Testar com contas distintas: administrador, entregador atribuído, outro entregador e cliente com link. Confirmar bloqueio de acesso indevido, token inválido/expirado e GPS antes do início/depois da conclusão.
5. Verificar mapa em computador e telemóvel, permissão recusada, perda de ligação, atualização e finalização. Distinguir GPS simulado de teste no dispositivo real; não fazer entregas reais durante os testes.

## Aprovação necessária
A aprovação autoriza avançar com a implementação proposta e apresentar as alterações do Supabase para execução autorizada. Até lá, nenhum recurso, configuração de autenticação, dado ou tabela será alterado.