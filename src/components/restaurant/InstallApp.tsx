import { useEffect, useState } from "react";
import { Smartphone, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as PromptEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (prompt) { await prompt.prompt(); await prompt.userChoice; setPrompt(null); return; }
    setHelp(true);
  };

  return <>
    <Button type="button" variant="outline" className="h-12 px-6" onClick={() => void install()}><Smartphone />Baixar app</Button>
    {help && <div role="dialog" aria-modal="true" aria-label="Instalar a app Matturo" className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 sm:items-center" onClick={() => setHelp(false)}>
      <div className="w-full max-w-sm rounded-xl bg-card p-6 text-card-foreground shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">Instalar a app Matturo</h2><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setHelp(false)}><X /></Button></div>
        {ios ? <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground"><li>No Safari, toque em <Share className="inline h-4 w-4" /> <strong>Partilhar</strong>.</li><li>Escolha <strong>Adicionar ao ecrã principal</strong>.</li><li>Toque em <strong>Adicionar</strong>.</li></ol>
          : <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground"><li>Abra o menu do navegador (⋮).</li><li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar ao ecrã principal</strong>.</li><li>Confirme.</li></ol>}
      </div>
    </div>}
  </>;
}
