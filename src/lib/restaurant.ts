export const restaurant = {
  name: "Matturo Burger",
  description: "Seja bem-vindo! A combinação perfeita entre pizzas deliciosas e hambúrgueres incríveis está aqui para si.",
  address: "R. Alm. Cândido dos Reis, Vila Franca de Xira, Portugal",
  phone: "+351 936 860 038",
  whatsapp: "https://wa.me/351936860038",
  instagram: "https://www.instagram.com/matturoburger",
  tiktok: "https://www.tiktok.com/@matturo.burger",
  maps: "https://www.google.com/maps/search/?api=1&query=38.9534874,-8.9883805",
  orderUrl: "/cardapio" as const,
  source: "https://matturoburger.com/",
};

export const money = (amount: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(amount);

export function restaurantHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Matturo Burger` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Matturo Burger` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] };
}