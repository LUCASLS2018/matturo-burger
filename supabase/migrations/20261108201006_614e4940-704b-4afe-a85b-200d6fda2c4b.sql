CREATE TABLE public.matturo_menu_items (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  image text,
  available boolean NOT NULL DEFAULT true,
  visible boolean NOT NULL DEFAULT true,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matturo_menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matturo_menu_items TO authenticated;
GRANT ALL ON public.matturo_menu_items TO service_role;
ALTER TABLE public.matturo_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read visible Matturo dishes" ON public.matturo_menu_items FOR SELECT TO anon, authenticated USING (visible = true OR public.matturo_has_role('admin'));
CREATE POLICY "Admins can add Matturo dishes" ON public.matturo_menu_items FOR INSERT TO authenticated WITH CHECK (public.matturo_has_role('admin'));
CREATE POLICY "Admins can edit Matturo dishes" ON public.matturo_menu_items FOR UPDATE TO authenticated USING (public.matturo_has_role('admin')) WITH CHECK (public.matturo_has_role('admin'));
CREATE POLICY "Admins can remove Matturo menu photos" ON public.matturo_menu_items FOR DELETE TO authenticated USING (public.matturo_has_role('admin'));
CREATE TRIGGER update_matturo_menu_items_updated_at BEFORE UPDATE ON public.matturo_menu_items FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();
CREATE POLICY "Admins can upload Matturo menu photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'matturo-menu-images' AND public.matturo_has_role('admin'));
CREATE POLICY "Admins can replace Matturo menu photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'matturo-menu-images' AND public.matturo_has_role('admin')) WITH CHECK (bucket_id = 'matturo-menu-images' AND public.matturo_has_role('admin'));
CREATE POLICY "Admins can remove Matturo menu photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'matturo-menu-images' AND public.matturo_has_role('admin'));
INSERT INTO public.matturo_menu_items (id,name,slug,description,category,price_cents,image,available,visible) VALUES
('a28eb809-67a7-4254-ae72-63e51984bb86','Combo 2 Pizzas(Individuais)','combo-2-pizzasindividuais','2 Pizzas Individuais 
Molho de tomate,mozzarela,fiambre e orégãos','promocoes',1300,'/__l5e/assets-v1/eae9a840-b6fe-4573-9987-32d74056c20b/combo-2-pizzasindividuais.png',true,true),
('a28eb977-5805-44b4-babe-64e3b564ef48','Combo 2 pizzas (individuais','combo-2-pizzas-individuais','2 pizzas
Molho de tomate fresco, queijo 
mussarela  e pepperoni picante, finalizados com orégano','promocoes',1400,'/__l5e/assets-v1/b99c3abc-f40f-42cb-80dc-ae1da6c83233/combo-2-pizzas-individuais.jpg',true,true),
('a1145cb7-48c1-4cfd-885d-cfd2ddb8f4f4','Combo 2 hamburguinho','combo-2-hamburguinho','👉Pão brioche,Smash artesanal, cheddar derretido e maionese exclusiva da casa. A combinação perfeita sem rodeios.Pequeno no preço, gigante no sabor.','promocoes',999,'/__l5e/assets-v1/db626f03-7c89-4818-b8e5-03c67c637583/combo-2-hamburguinho.jpeg',true,true),
('a1145cbc-3ed3-433f-83a4-dfbed3131cf7','combo 2 Salad Bacon','combo-2-salad-bacon','Pão brioche,molho Matturo,carne smash 80gr,cheddar,alface,tomate','promocoes',1099,'/__l5e/assets-v1/b475695b-fad3-4f3b-9cbd-9830bcda2fe0/combo-2-salad-bacon.jpeg',true,true),
('a1145cc4-a35d-4cbb-8560-ae61d6fde566','combo 2TriploOverdose','combo-2triplooverdose','Pão brioche, maionese verde, 3 carnes smash de 80 g, cheddar, bacon e cebola caramelizada.','promocoes',1799,'/__l5e/assets-v1/a52428a2-91d0-4fef-982d-54bff3e0c445/combo-2triplooverdose.jpeg',true,true),
('a1e3c7b5-3f4c-41bb-bfa4-7619cfc1fa99','Margarita','margarita','Molho de tomate ,Queijo Mozzarella e orégãos','pizza',650,'/__l5e/assets-v1/b539eccc-7746-49f2-a6e2-119690bc7561/margarita.jpeg',true,true),
('a1e3c8e2-7407-40aa-9226-17345c7c4f00','4 estacões','4-estacoes','Mozzarella , fiambre  cogumelos frescos e o  oregãos','pizza',799,'/__l5e/assets-v1/ad76abaf-3c9f-4b95-b0d4-7c2aab8252f6/4-estacoes.jpeg',true,true),
('a1e3dd5b-e6cf-4ea1-9b98-026beda1a109','Ka Preziosa','ka-preziosa','Molho de tomate, mozzarella, fiambre, cogumelos e pimento','pizza',799,'/__l5e/assets-v1/4b5d18ec-2baa-44a0-93ec-e479cea7bbdc/ka-preziosa.jpeg',true,true),
('a1efbbcc-70b7-49c6-9ef4-05b2768b0356','Peperoni','peperoni','Molho de tomate fresco, queijo mussarela  e pepperoni picante, finalizados com orégano','pizza',799,'/__l5e/assets-v1/d0f0b79c-56be-404e-aa5b-4e338c6cf2c9/peperoni.jpg',true,true),
('a1e3def8-d577-46e7-b6f9-167929ff8591','Delícia de Frango','delicia-de-frango','Molho de tomate com frango , queijo mozzarella derretido, catupiry cremoso e oregãos','pizza',899,'/__l5e/assets-v1/cf541a66-d50c-416e-947a-d87ba7a5ecaa/delicia-de-frango.jpeg',true,true),
('a1e3e00c-30ab-4d53-a712-b37018eb9c12','Carbonara','carbonara','Tomate fresco, mozzarella , bacon , cogumelos , natas  ovo e oregano','pizza',899,'/__l5e/assets-v1/31e097e4-2b91-4022-b41b-9833f0047981/carbonara.jpeg',true,true),
('a1e3e07c-7165-4bdd-affb-9a041c724224','Vegetariana','vegetariana','Molho de tomate, mozzarella, cogumelos, cebola, pimento, milho e azeitona.','pizza',899,'/__l5e/assets-v1/9c53fc1a-9d27-49da-b67b-757cfb9d4e96/vegetariana.jpg',true,true),
('a1e3e0b7-188b-47ed-9242-09c5ec201035','Strogonof','strogonof','Molho  de tomate, queijo mussarela, frango  ,cogumelos frescos ,natas e oragano','pizza',899,'/__l5e/assets-v1/b0513c4b-5633-4f85-a8f0-4adb63ae17a1/strogonof.jpg',true,true),
('a1e3de9a-c79e-4cf4-a79e-1d606ab60043','Especial da casa','especial-da-casa','Molho de tomate  ,mozzarella, bacon, fiambre, milho e catupiry.','pizza',999,'/__l5e/assets-v1/a8595be2-1d81-4ec8-8bce-fcdfd04b9f05/especial-da-casa.jpg',true,true),
('a1e3df49-fef2-4053-974d-97455994d6ff','Maré de Camarão','mare-de-camarao','Molho de tomate, mozzarella, camarão , delícias do mar e atum,  oregãos.','pizza',999,'/__l5e/assets-v1/5746a8c9-4c91-4495-b455-9dcb046cf61a/mare-de-camarao.jpeg',true,true),
('a1e3df92-edcd-48d4-ad41-cce7450f8d02','Suprema','suprema','Molho de tomate ,mozzarella derretida, chouriço , fiambre, cogumelos frescos, gorgonzola cremoso, ovo cozido e oregãos','pizza',999,'/__l5e/assets-v1/ee2d265e-5dc1-4bc2-80de-5569056ee298/suprema.jpeg',true,true),
('a1e3dfc3-aa1e-4eb3-a98a-76ca931e0b4e','Saborosa','saborosa','Molho  de tomate com mozzarella, carne moída suculenta, pimento cebola, azeitonas e ovo cozido.','pizza',999,'/__l5e/assets-v1/221d455c-92ff-47d3-8642-2941ed1faccc/saborosa.jpeg',true,true),
('a1e3e045-cc97-4ca7-982c-b14e868e367d','Campestre','campestre','Molho de tomate  com mozzarella ,chouriço , cogumelos frescos, azeitonas e cebola, finalizado com emmenthal e oregãos.','pizza',999,'/__l5e/assets-v1/d312a5fa-31c1-42eb-853a-ccddc970d340/campestre.jpeg',true,true),
('a1e3e0e1-ff30-4821-a0b8-68fd27709bb4','4 Queijos','4-queijos','molho de tomate com mozzarella, gorgonzola, emmenthal, parmesão e orégano.','pizza',999,'/__l5e/assets-v1/6b90a017-1152-4d3c-8a97-d52d4de88a48/4-queijos.jpeg',true,true),
('a1e3e126-3894-437a-9698-a563e0972927','MODA TTURO','moda-tturo','Molho de tomate  com queijo mussarela, carne picada suculenta, bacon ,milho , azeitonas, cogumelos, ovo cozido , ananás e orégãos.','pizza',999,'/__l5e/assets-v1/57097ee8-fffd-423c-a042-adbb02d824bf/moda-tturo.jpeg',true,true),
('a1efb8f8-81bb-4621-8e3d-e300bc9bdbae','Calabresa','calabresa','molho de tomate, queijo mussarela ccalabresa , cebola e orégano','pizza',999,'/__l5e/assets-v1/c03cf117-4057-4dc3-a55c-16505d4605b1/calabresa.jpeg',true,true),
('a0e455d6-5e1e-414c-b0cf-c873bed34efe','hamburguinho','hamburguinho','👉Pão brioche,Smash artesanal, cheddar derretido e maionese exclusiva da casa. A combinação perfeita sem rodeios.Pequeno no preço, gigante no sabor.
C','hamburguer',500,'/__l5e/assets-v1/90ce849c-d3c4-4450-a140-0545800e0a51/hamburguinho.jpeg',true,true),
('a0e455dd-1ded-4bb5-8f9c-671dcfbadc05','HAMBURGUER matturo','hamburguer-matturo','Pão brioche, maionese Matturo, 2 fatias de cheddar e 2 carnes smash de 80 g.','hamburguer',800,'/__l5e/assets-v1/5f48a7c2-9052-4613-a322-5776c39fb819/hamburguer-matturo.jpeg',true,true),
('a0e455e5-5d7b-4242-b5b4-59d2b682a385','HAMBURGUER  Triplo Overdose','hamburguer-triplo-overdose','Pão brioche, maionese verde, 3 carnes smash de 80 g, cheddar, bacon e cebola caramelizada.','hamburguer',1100,'/__l5e/assets-v1/52edde02-928d-4364-8344-913fa8cdec59/hamburguer-triplo-overdose.jpeg',true,true),
('a2f966db-44ad-49d3-aede-35291f6d4b02','Hamburguer X-tonelada','hamburguer-x-tonelada','💥 X Tonelada 💥
Se prepara, porque aqui é peso pesado! São 2 hambúrgueres suculentos de 70g, acompanhados de 2 ovos bem cremosos, 4 tiras crocantes de bacon e uma camada generosa de cheddar derretido. Tudo isso dentro de um pão brioche macio, com o toque especial da maionese verde, frescor da alface e do tomate, o docinho do milho e aquela crocância insana da batata palha. É o lanche que desafia a fome e conquista no sabor! 🔥🤤
Acompanha Batata','hamburguer',1100,'/__l5e/assets-v1/fd9b57b6-c2cb-4022-9a2d-84b243638b1c/hamburguer-x-tonelada.jpg',true,true),
('a0e455f0-1c51-42a4-9c20-6e8348517144','HAMBURGUER  Poço de Cheddar','hamburguer-poco-de-cheddar','👉Pão brioche, Smash mergulhado em cheddar cremoso com farofa de bacon. O sonho de qualquer amante de queijo..','hamburguer',1100,'/__l5e/assets-v1/e5b6f39d-15d9-40ef-b068-dd8d9be05355/hamburguer-poco-de-cheddar.jpg',true,true),
('a0e455f9-f555-45da-800d-b5f89f1dc2b6','HAMBURGUER  Croc Burger','hamburguer-croc-burger','Pão brioche,maionese verde, frango, cheddar,alface,tomate e bacon.','hamburguer',920,'/__l5e/assets-v1/015cd0ac-2c7b-4b57-83cf-8081cf6c092e/hamburguer-croc-burger.jpeg',true,true),
('a0e45608-eb02-493c-b6bc-c92116add04d','HAMBURGUER  BBQ Beast','hamburguer-bbq-beast','Pão brioche, molho BBQ, 2 smash de 80 g, cheddar, bacon e cebola grelhada.','hamburguer',920,'/__l5e/assets-v1/f08ad066-50fc-451b-a970-1782bf77148e/hamburguer-bbq-beast.jpeg',true,true),
('a0e45612-503f-4036-bb01-7f7aca81bbb8','HAMBURGUER  Fatpig','hamburguer-fatpig','Pão brioche, molho matturo, 2 carnes smash de 80 g, cheddar e 4 fatias de bacon.','hamburguer',850,'/__l5e/assets-v1/6d34092f-1ad0-4a43-9c67-da970edb2649/hamburguer-fatpig.jpeg',true,true),
('a0e4561d-101c-4375-b0bf-9f1a2fd7a4f5','HAMBURGUER  Piu Piu Tturo','hamburguer-piu-piu-tturo','Pão brioche, maionese verde, carne smash de 80 g, cheddar, bacon, ovo e batata palha.','hamburguer',800,'/__l5e/assets-v1/166ee020-dc71-4fad-af9f-03be4436af29/hamburguer-piu-piu-tturo.jpeg',true,true),
('a0e4562a-24b6-4aa0-88e1-e7f1ccbdde1f','HAMBURGUER Salad Bacon','hamburguer-salad-bacon','Pão brioche,molho Matturo,carne smash 80gr,cheddar,alface,tomate','hamburguer',600,'/__l5e/assets-v1/8b0a1690-5e30-467c-9ced-a6da3a1efa4d/hamburguer-salad-bacon.jpeg',true,true),
('a0e45635-9e4f-4639-a926-c839b4b2442a','HAMBURGUER  Matturito','hamburguer-matturito','👉Pão brioche, Smash simples com cheddar, bacon e a maionese Matturo. Pequeno no preço, gigante no sabor.','hamburguer',550,'/__l5e/assets-v1/3788e82b-c9b3-4237-8587-2e6e76bfad27/hamburguer-matturito.jpeg',true,true),
('a0e4563d-3818-47e3-b9ea-7d0b115f0780','HAMBURGUER  fungada','hamburguer-fungada','pao brioche .molho matturo ,carne 70 gr,cheddar,bacon ,cebola caramelizada ,gorgonzola','hamburguer',900,'/__l5e/assets-v1/0658375e-d111-4ef2-992e-e70ef719d632/hamburguer-fungada.jpeg',true,true),
('a0e45652-ada2-479f-8d12-6ec2dadd9f0c','HAMBURGUER  x tudo','hamburguer-x-tudo','🔥 O Brabo da Casa 🔥
Um pão brioche fofinho abraçando um hambúrguer de 70g de pura suculência, coberto com cheddar derretido e um ovo no ponto perfeito. Pra equilibrar, a crocância da alface e a refrescância do tomate. É o tipo de combinação que faz o coração bater mais forte e o estômago agradecer! 🤤✨','hamburguer',840,'/__l5e/assets-v1/43346a03-4d84-486a-8d28-99b573a44ca5/hamburguer-x-tudo.jpg',true,true),
('a0e4565a-c1fa-476f-bc73-cc4f32be890a','hamburguer x-egg','hamburguer-x-egg','🍳 X-Egg 🍳
O combo perfeito do dia a dia: pão brioche fofinho, um hambúrguer de 70g suculento, coroado com ovo no ponto certo e cheddar derretido. Pra deixar ainda mais especial, a frescura da alface e a suculência do tomate. Um clássico que nunca falha! 😍🔥','hamburguer',750,'/__l5e/assets-v1/95a6dedc-6384-40fd-bea5-22071e7a799c/hamburguer-x-egg.jpg',true,true),
('a0e45674-9503-4abe-8fa9-1e5c937f4b1c','HAMBURGUE bacon lover','hamburgue-bacon-lover','🥓 Bacon Lover 🥓
Se você é fã de bacon, esse é O lanche! Um pão brioche fofinho abraçando um hambúrguer suculento de 70g, coberto com cheddar derretido, muita crocância de bacon, o toque adocicado da cebola caramelizada e o clássico molho BBQ que amarra tudo com perfeição. É amor à primeira mordida! 🤤🔥','hamburguer',750,'/__l5e/assets-v1/12d00b5f-d521-4320-af85-e7979a376eeb/hamburgue-bacon-lover.jpeg',true,true),
('a213e340-96c4-40f0-87fe-d6143706d4ed','Pao de alho','pao-de-alho','','entradas',200,NULL,true,true),
('9f9660fa-5d77-40be-ac53-64e6bde63cfb','Batata','batata','','entradas',200,'/__l5e/assets-v1/2b91dded-34e0-49c6-8704-818e518869e7/batata.png',true,true),
('9f9661cf-9872-426f-b0d6-b6a222d640f8','Nuggets','nuggets','','entradas',350,'/__l5e/assets-v1/716e3d4e-0e55-4c99-b224-818547f786b4/nuggets.jpg',true,true),
('9fee837c-a0a6-475c-949a-f79bb84420a6','aros de cebola','aros-de-cebola','','entradas',350,'/__l5e/assets-v1/904a0a7b-15ba-43dd-b92b-e2c4ed11b88c/aros-de-cebola.png',true,true),
('a0154c14-23f5-461a-a52a-6b2ecec02575','pote de cheddar','pote-de-cheddar','','entradas',100,NULL,true,true),
('a0154c54-a6a8-4b6b-8177-9e04c010fe94','pote maionese verde','pote-maionese-verde','','entradas',50,NULL,true,true),
('a0154c72-f29d-47ea-998b-30bfcb207806','pote molho matturo','pote-molho-matturo','','entradas',100,NULL,true,true),
('a0154ce5-3dc9-4658-bfe2-251573e5c0f6','pote molho bbq','pote-molho-bbq','','entradas',100,NULL,true,true),
('9fe2c3ae-afa6-44c1-a50d-379e3f7e84d5','honey baby','honey-baby','Pao brioche selado com mel,nuttela,e morangos grelhados no mel','sobremesa',400,NULL,true,true),
('a21216f2-8ebe-4579-abeb-d0076b894f71','Doce da avó','doce-da-avo','','sobremesa',300,NULL,true,true),
('a2febc85-74aa-46d6-9a41-d2a994ca7a63','mousse de chocolate','mousse-de-chocolate','','sobremesa',0,NULL,false,true),
('a2febcd1-3bd8-4548-8b3b-70aab0e076bc','chessecake','chessecake','','sobremesa',350,NULL,true,true),
('a1f1b4cd-b2f1-451b-9138-e1c5f696e965','Coca-cola','coca-cola','','bebidas',180,'/__l5e/assets-v1/b35d6a3e-a10d-4191-967d-611c16d047bc/coca-cola.jpg',true,true),
('a1f1b511-4765-44ec-8e9e-cb9c1d168425','guarana','guarana','','bebidas',180,'/__l5e/assets-v1/e96e6c32-f596-4007-9b5f-23366b894f72/guarana.jpg',true,true),
('a1f1b526-824a-4799-9b9d-5368cc5ee19c','ice-tea pessego','ice-tea-pessego','','bebidas',180,'/__l5e/assets-v1/54918346-157a-46e9-b9ed-50239a21ba0b/ice-tea-pessego.jpg',true,true),
('a1f1b54c-43e0-4998-9f00-500b0b3f2293','ice-tea manga','ice-tea-manga','','bebidas',180,'/__l5e/assets-v1/a7a7ad41-da6e-47bb-8c71-8d7cc5ad3e49/ice-tea-manga.jpg',true,true),
('a1f1b566-086f-4b2a-b48c-ecec5bb9a3cb','ice-tea limão','ice-tea-limao','','bebidas',180,'/__l5e/assets-v1/26c48250-c7fe-4af7-81d5-fdb00380f819/ice-tea-limao.jpg',true,true),
('a20b5df5-ac9c-406b-9664-ed943378ed8d','agua','agua','','bebidas',100,NULL,true,true);