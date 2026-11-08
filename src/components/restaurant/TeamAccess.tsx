import {useEffect,useState} from "react";
import {Link,useRouter} from "@tanstack/react-router";
import {UserRound} from "lucide-react";
import {Button} from "@/components/ui/button";
import {supabase} from "@/integrations/supabase/client";
export function TeamAccess(){const [signedIn,setSignedIn]=useState(false);const router=useRouter();useEffect(()=>{void supabase.auth.getUser().then(r=>setSignedIn(Boolean(r.data.user)));const {data}=supabase.auth.onAuthStateChange((event,session)=>{if(!["SIGNED_IN","SIGNED_OUT","USER_UPDATED"].includes(event))return;setSignedIn(Boolean(session));void router.invalidate();});return()=>data.subscription.unsubscribe();},[router]);return <Button asChild variant="ghost" size="icon" aria-label={signedIn?"Painel da equipa":"Acesso da equipa"}><Link to={signedIn?"/entregas":"/auth"}><UserRound/></Link></Button>;}