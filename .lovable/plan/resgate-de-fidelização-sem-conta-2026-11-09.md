# Resgate de fidelização sem conta

## Experiência do cliente
- Manter a acumulação automática pelo telemóvel dos pedidos, sem inscrição, e o saldo agrupado por número no painel Fidelização.
- Acrescentar acesso a «Os meus pontos» no site e na finalização. Pedir o telemóvel e um código recebido por SMS, sem e-mail nem palavra-passe.
- Após confirmação, mostrar apenas os pontos desse número. Aos 100 pontos, apresentar «Resgatar Hamburguinho grátis» e abrir as opções do produto.
- Aplicar gratuitamente o preço base do Hamburguinho; extras e portes continuam pagos. Admitir um resgate por pedido.
- Descontar 100 pontos somente ao enviar o pedido, nunca ao abrir o produto ou adicionar ao carrinho. Se cancelado, devolver os pontos uma única vez.
- Preservar pedidos e acessos existentes, incluindo a administração e as contas opcionais.

## Proteção e dados
- Confirmar a posse do telemóvel antes de permitir consulta ou resgate; escrever um número no pedido continua suficiente para acumular, mas não para gastar pontos.
- Unificar números portugueses com e sem +351 e validar os demais números em formato internacional, sem juntar clientes de países diferentes.
- Manter todos os dados privados, sem acesso público às carteiras ou histórico.
- Guardar a confirmação com validade limitada e limitar envios, tentativas de código e reenvios. Não alterar as regras de entrada da equipa.
- Criar o pedido com desconto e debitar pontos numa única operação: se qualquer parte falhar, nada fica gravado. Impedir resgates simultâneos acima do saldo e repetições por atualização da página.

## Alterações técnicas propostas para aprovação
- Criar recursos isolados `matturo_*` para carteira/identidade por telemóvel, confirmação temporária e movimentos de pontos, com permissões explícitas e RLS privada. Não alterar recursos NovaFix.
- Migrar o saldo dos pedidos concluídos e resgates existentes sem duplicar ganhos ou débitos; preservar os preços e as opções históricas dos pedidos.
- Usar funções do servidor para confirmação, consulta e envio; uma operação PostgreSQL transacional bloqueia a carteira e grava o pedido e o débito juntos.
- Creditar pedidos concluídos e reverter os débitos de pedidos cancelados com movimentos únicos, incluindo cancelamentos e conclusões feitos pelo painel ou pelas entregas.
- A confirmação de fidelização será independente da sessão da equipa e não exigirá que o cliente crie uma conta.

## Dependência para ativação
A consulta das configurações atuais confirmou que a entrada por telemóvel está desativada. Ainda não foi possível confirmar um serviço de SMS configurado. É necessário autorizar e configurar um serviço de envio de códigos; SMS podem ter custos. Nenhum serviço pago será contratado ou ativado automaticamente. A escolha/configuração do serviço será apresentada antes de ativar os envios.

## Verificação
- Testar saldo por telemóvel, ganhos apenas em produtos de pedidos concluídos, limiar de 100 pontos, preço base gratuito e extras pagos.
- Testar débito ao enviar, devolução única ao cancelar, tentativas concorrentes e repetição da mesma submissão.
- Testar código incorreto/expirado, limites de tentativas, troca de número e ausência de acesso a pontos de outro cliente.
- Confirmar no navegador o fluxo completo em telemóvel e computador, incluindo recebimento real de código após configurar SMS. Sem esse serviço, não declarar o resgate completo como verificado.