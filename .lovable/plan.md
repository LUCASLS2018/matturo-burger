# Gestão completa do Matturo Burger

## Situação verificada
- O cardápio atual contém 54 produtos e 6 categorias, com fotografias e opções originais. Está num catálogo estático, não numa área editável.
- O carrinho fica no navegador; a finalização prepara uma mensagem de WhatsApp, mas não regista pedidos no Matturo.
- Existem seis recursos exclusivos Matturo: perfis, funções de acesso, entregas, posição GPS atual, histórico de estados e links seguros. As entregas ainda são criadas manualmente, sem ligação a pedidos.
- O acesso de administrador foi atribuído e confirmado para a conta escolhida. O ciclo completo com diferentes contas de estafetas ainda precisa de testes.

## O que será construído
### 1. Cardápio e configurações
- Painel com Visão geral, Pedidos, Produtos, Categorias, Estafetas, Entregas, Clientes e Configurações.
- Preservar fundo creme, laranja/dourado, tipografia expressiva, logo preta e fotografias originais; manter os cartões públicos escolhidos.
- Importar os 54 produtos, 6 categorias e todas as opções atuais para recursos exclusivos Matturo, sem produtos fictícios ou alterações ao catálogo NovaFix.
- Editar nomes, preços em EUR, descrições, fotos, categorias, opções, disponibilidade e ordem de apresentação.
- Salvamento automático com atraso curto, estados “A guardar”, “Guardado”, erro e nova tentativa. Só mostrar sucesso após confirmação do servidor; evitar conflitos entre edições simultâneas.
- Sincronizar alterações com o cardápio público. Produtos desativados deixam de ser compráveis; esgotados aparecem identificados.
- Configurar portes por zona e pausa dos pedidos, mantendo o site acessível. Não inventar zonas, preços, horários ou regras comerciais.

### 2. Pedidos próprios do site
- Substituir a finalização por WhatsApp pelo registo direto de pedidos Matturo; manter WhatsApp apenas como contacto opcional.
- Preservar Delivery, Levantamento e Comer no local. Sem pagamentos online: apresentar estado de pagamento não confirmado, sem presumir pagamento recebido.
- Aceitar pedidos sem exigir conta; devolver confirmação e acesso exclusivo ao pedido. Clientes com conta podem consultar apenas os próprios pedidos, sem receber acesso à equipa.
- Validar preços, quantidades, opções, disponibilidade, pausa e zona de entrega no servidor antes de aceitar. Confirmar alterações de preço com o cliente; impedir duplicações em tentativas repetidas.
- Guardar os nomes, preços, opções, quantidades e portes de cada compra como registo imutável: editar o cardápio nunca altera pedidos antigos.
- Central em tempo real com detalhes, filtros por estado, alertas visuais e som opcional. Histórico das mudanças e responsáveis.

### 3. Estafetas e entregas ligadas ao pedido
- “Atribuir estafeta” apresenta nome, fotografia, disponibilidade e número de entregas ativas; o administrador escolhe e confirma.
- Atribuir automaticamente os dados do pedido à conta selecionada, sem copiar morada, telefone ou produtos. Não escolher estafetas automaticamente sem decisão do administrador.
- Obter destino a partir da morada/zona e pedir ao cliente confirmação do ponto no mapa; não exigir que o administrador introduza coordenadas. Uma morada ambígua não recebe um destino inventado.
- Estafeta vê apenas pedidos atribuídos, contactos necessários, itens, observações, pagamento informado, mapa e navegação.
- Estados: entrega atribuída, a caminho do restaurante, pedido recolhido, em trânsito e concluída. Ocupado após atribuição; disponível após terminar apenas se não houver outras entregas ativas. Inativo impede novas atribuições.
- Cancelamento sincroniza pedido e entrega, liberta disponibilidade e termina rastreamento; levantamento/comer no local não criam entregas.

### 4. Acompanhamento e segurança
- Aproveitar Leaflet/OpenStreetMap e os links imprevisíveis existentes. GPS apenas após confirmação, início da entrega e permissão do dispositivo.
- Parar captura e eliminar posição ao concluir/cancelar; manter histórico de estados, não percurso GPS histórico.
- Atualizações em tempo real nos painéis. Para clientes, usar canal privado autorizado apenas para aquele link/entrega, com consulta segura periódica como alternativa; nunca permitir leitura pública das tabelas GPS.
- Link expirável/revogável, respostas sem armazenamento em cache e exposição mínima de dados. Sem contactos ou perfil completo do estafeta no acompanhamento público.
- Mostrar última atualização e perda de ligação. Estimativa de chegada só quando houver fonte e dados suficientes; sem prometer GPS contínuo com telemóvel bloqueado.

## Alterações técnicas propostas
Todas as novas tabelas incluem permissões explícitas, RLS, datas e validação no servidor.

| Recurso exclusivo | Informação principal |
|---|---|
| `matturo_menu_categories` | Categorias, imagem, ordem e ativação |
| `matturo_menu_items` | Produtos, preço em cêntimos, fotografia, disponibilidade e revisão |
| `matturo_modifier_groups`, `matturo_modifiers` | Opções, limites e adicionais reais |
| `matturo_restaurant_settings` | Pausa e modalidades habilitadas |
| `matturo_delivery_zones` | Zonas, limites e portes configurados |
| `matturo_orders`, `matturo_order_items` | Cliente, modalidade, estados, totais e cópias imutáveis dos itens/opções |
| `matturo_order_events` | Histórico de alterações |
| `matturo_order_access_links` | Acesso seguro de clientes sem conta |
| `matturo_courier_availability` | Disponibilidade operacional dos estafetas |

- Estender `matturo_deliveries` com ligação única ao pedido e etapas de recolha; manter entregas antigas sem apagar dados.
- Atualizar apenas funções/políticas Matturo para atribuição, cancelamento, consulta segura e sincronização. Atribuição e mudanças de estado usam transações e bloqueios contra concorrência.
- Novas fotos em armazenamento exclusivo Matturo, com escrita limitada a administradores. Fotografias atuais e recortes permanecem preservados.
- Catálogo público expõe apenas campos publicados; dados de clientes/pedidos são privados. Administrador validado no servidor; estafetas limitados à atribuição; clientes limitados à propriedade ou link seguro.
- Funções internas TanStack com autenticação quando necessária; criação pública de pedidos com validação, limitação de abuso e proteção contra repetição. Não usar Supabase Edge Functions nem integrar pagamentos.
- Realtime com políticas de acesso e limpeza de subscrições. Autossalvamento usa revisões e confirmação de persistência.
- A migração do catálogo incluirá os dados reais completos, não um preenchimento posterior por carregamento da página.

## Validação por etapa
- Conferir importação dos 54 produtos e opções, preços concretos, categorias e fotos sem perdas.
- Testar autosave, falha de rede, conflito entre duas edições, leitura posterior e sincronização pública.
- Testar pausa, produtos esgotados/desativados, adulteração de preços, opções obrigatórias, portes por zona, duplicação de envio e preservação de pedidos antigos.
- Testar pedido real de ensaio no site → painel → atribuição → conta do estafeta → início/GPS simulado → acompanhamento → conclusão/cancelamento.
- Testar acesso negado com outro estafeta/cliente, links inválidos/expirados/revogados, GPS antes/depois de entrega e duas atribuições concorrentes.
- Verificar computador, tablet e telemóvel. Distinguir GPS simulado de ensaio com dispositivo real. Autenticação automática neste Supabase externo é limitada; não declarar testes privados aprovados sem executá-los.

## Limites e autorização
- Esta aprovação autoriza criar/estender apenas os recursos Matturo descritos e passar os pedidos para o próprio site, por etapas. Cada conjunto de migrações será apresentado antes de execução.
- Nenhuma tabela NovaFix será modificada ou apagada; nenhuma funcionalidade existente será eliminada sem substituição equivalente.
- Não configurar Stripe/Klarna, não cobrar pagamentos reais, não contratar serviços pagos e não publicar automaticamente.
- As zonas e respetivos portes ainda precisam dos seus valores reais antes de ativar Delivery. O painel permitirá configurá-los; até lá, não aceitar pedidos delivery com valor inventado.