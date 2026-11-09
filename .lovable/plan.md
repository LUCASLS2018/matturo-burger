# Numeração diária dos pedidos

## Resultado
- Cada dia começa no **Pedido 1**, seguido de **2, 3, 4…**.
- A contagem reinicia à meia-noite de Portugal, incluindo a mudança de horário de verão.
- A sequência é única para todos os pedidos do dia: Delivery, Retirada, Comer no local e pedidos manuais.
- Os números aparecem de forma consistente no painel, nos pedidos concluídos, nas entregas e na página do cliente.
- Pedidos cancelados mantêm o seu número; os números não são reutilizados.

## Preservação
- Manter os códigos internos e os links privados existentes, sem alterar preços, produtos, pontos ou dados NovaFix.
- Numerar os pedidos já existentes por dia e pela ordem em que foram criados, do mais antigo ao mais recente.

## Alteração a autorizar
Adicionar a cada pedido Matturo o dia e o número diário, com um contador privado por dia. A atribuição será automática ao guardar o pedido, para evitar números repetidos quando dois clientes encomendam ao mesmo tempo. Repetir o envio do mesmo pedido conserva o número original.

## Detalhes técnicos
- Migração isolada em recursos `matturo_*`: campos `order_day` e `daily_number`, unicidade conjunta e contador diário sem acesso público.
- Atribuição transacional no fluxo existente de criação, com data `Europe/Lisbon`, protegendo concorrência e idempotência.
- Manter `reference` única e estável; apresentar o número diário através de um formatador partilhado e incluir a data nos históricos para distinguir números de dias diferentes.
- Testar começo em 1, incremento, reinício no dia seguinte, horário de verão, concorrência e repetição de envio; verificar as páginas afetadas e a persistência.