import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

// Department code → name (kept minimal; expanded list is in client)
const DEPT_NAMES: Record<string, string> = {
  '01':'Ain','02':'Aisne','03':'Allier','04':'Alpes-de-Haute-Provence','05':'Hautes-Alpes','06':'Alpes-Maritimes','07':'Ardèche','08':'Ardennes','09':'Ariège','10':'Aube','11':'Aude','12':'Aveyron','13':'Bouches-du-Rhône','14':'Calvados','15':'Cantal','16':'Charente','17':'Charente-Maritime','18':'Cher','19':'Corrèze','2A':'Corse-du-Sud','2B':'Haute-Corse','21':"Côte-d'Or",'22':"Côtes-d'Armor",'23':'Creuse','24':'Dordogne','25':'Doubs','26':'Drôme','27':'Eure','28':'Eure-et-Loir','29':'Finistère','30':'Gard','31':'Haute-Garonne','32':'Gers','33':'Gironde','34':'Hérault','35':'Ille-et-Vilaine','36':'Indre','37':'Indre-et-Loire','38':'Isère','39':'Jura','40':'Landes','41':'Loir-et-Cher','42':'Loire','43':'Haute-Loire','44':'Loire-Atlantique','45':'Loiret','46':'Lot','47':'Lot-et-Garonne','48':'Lozère','49':'Maine-et-Loire','50':'Manche','51':'Marne','52':'Haute-Marne','53':'Mayenne','54':'Meurthe-et-Moselle','55':'Meuse','56':'Morbihan','57':'Moselle','58':'Nièvre','59':'Nord','60':'Oise','61':'Orne','62':'Pas-de-Calais','63':'Puy-de-Dôme','64':'Pyrénées-Atlantiques','65':'Hautes-Pyrénées','66':'Pyrénées-Orientales','67':'Bas-Rhin','68':'Haut-Rhin','69':'Rhône','70':'Haute-Saône','71':'Saône-et-Loire','72':'Sarthe','73':'Savoie','74':'Haute-Savoie','75':'Paris','76':'Seine-Maritime','77':'Seine-et-Marne','78':'Yvelines','79':'Deux-Sèvres','80':'Somme','81':'Tarn','82':'Tarn-et-Garonne','83':'Var','84':'Vaucluse','85':'Vendée','86':'Vienne','87':'Haute-Vienne','88':'Vosges','89':'Yonne','90':'Territoire de Belfort','91':'Essonne','92':'Hauts-de-Seine','93':'Seine-Saint-Denis','94':'Val-de-Marne','95':"Val-d'Oise",'971':'Guadeloupe','972':'Martinique','973':'Guyane','974':'La Réunion','976':'Mayotte'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { department_code } = await req.json();
    if (!department_code || !DEPT_NAMES[department_code]) {
      return new Response(JSON.stringify({ error: 'Invalid department_code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const deptName = DEPT_NAMES[department_code];

    // Already populated? skip
    const { count: existing } = await supabase
      .from('animal_departments')
      .select('*', { count: 'exact', head: true })
      .eq('department_code', department_code);

    if (existing && existing > 0) {
      return new Response(JSON.stringify({ ok: true, cached: true, count: existing }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all known animals
    let allAnimals: { name: string; category: string }[] = [];
    let page = 0;
    while (true) {
      const { data } = await supabase
        .from('animals')
        .select('name, category')
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!data || data.length === 0) break;
      allAnimals = allAnimals.concat(data);
      if (data.length < 1000) break;
      page++;
    }

    if (allAnimals.length === 0) {
      return new Response(JSON.stringify({ ok: true, count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ask AI which animals are observable in this department
    const animalList = allAnimals.map((a) => a.name).join('\n');
    const prompt = `Voici une liste d'animaux. Indique uniquement ceux qui sont naturellement observables dans le département français "${deptName}" (${department_code}), en incluant les animaux communs (oiseaux de jardin, mammifères courants, insectes, etc.) ainsi que les espèces spécifiques à la région. Inclus aussi les animaux domestiques courants (chien, chat, etc.) car ils sont partout.

Liste:
${animalList}

Réponds UNIQUEMENT avec un tableau JSON des noms exacts (string[]). Aucun texte autour.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI error', details: txt }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? '[]';
    let names: string[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) names = parsed;
      else if (Array.isArray(parsed.animals)) names = parsed.animals;
      else if (Array.isArray(parsed.names)) names = parsed.names;
      else {
        // grab first array value
        const v = Object.values(parsed).find((x) => Array.isArray(x));
        if (v) names = v as string[];
      }
    } catch {
      // try regex fallback
      const m = content.match(/\[[\s\S]*\]/);
      if (m) names = JSON.parse(m[0]);
    }

    // Filter to known animals (case-insensitive match)
    const knownLower = new Map(allAnimals.map((a) => [a.name.toLowerCase(), a.name]));
    const rows = names
      .map((n) => knownLower.get(String(n).toLowerCase()))
      .filter((n): n is string => !!n)
      .map((animal_name) => ({ animal_name, department_code }));

    if (rows.length > 0) {
      await supabase.from('animal_departments').upsert(rows, { onConflict: 'department_code,animal_name' });
    }

    return new Response(JSON.stringify({ ok: true, count: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
