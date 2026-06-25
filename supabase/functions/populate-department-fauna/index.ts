import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Department code → name (kept minimal; expanded list is in client)
const DEPT_NAMES: Record<string, string> = {
  '01':'Ain','02':'Aisne','03':'Allier','04':'Alpes-de-Haute-Provence','05':'Hautes-Alpes','06':'Alpes-Maritimes','07':'Ardèche','08':'Ardennes','09':'Ariège','10':'Aube','11':'Aude','12':'Aveyron','13':'Bouches-du-Rhône','14':'Calvados','15':'Cantal','16':'Charente','17':'Charente-Maritime','18':'Cher','19':'Corrèze','2A':'Corse-du-Sud','2B':'Haute-Corse','21':"Côte-d'Or",'22':"Côtes-d'Armor",'23':'Creuse','24':'Dordogne','25':'Doubs','26':'Drôme','27':'Eure','28':'Eure-et-Loir','29':'Finistère','30':'Gard','31':'Haute-Garonne','32':'Gers','33':'Gironde','34':'Hérault','35':'Ille-et-Vilaine','36':'Indre','37':'Indre-et-Loire','38':'Isère','39':'Jura','40':'Landes','41':'Loir-et-Cher','42':'Loire','43':'Haute-Loire','44':'Loire-Atlantique','45':'Loiret','46':'Lot','47':'Lot-et-Garonne','48':'Lozère','49':'Maine-et-Loire','50':'Manche','51':'Marne','52':'Haute-Marne','53':'Mayenne','54':'Meurthe-et-Moselle','55':'Meuse','56':'Morbihan','57':'Moselle','58':'Nièvre','59':'Nord','60':'Oise','61':'Orne','62':'Pas-de-Calais','63':'Puy-de-Dôme','64':'Pyrénées-Atlantiques','65':'Hautes-Pyrénées','66':'Pyrénées-Orientales','67':'Bas-Rhin','68':'Haut-Rhin','69':'Rhône','70':'Haute-Saône','71':'Saône-et-Loire','72':'Sarthe','73':'Savoie','74':'Haute-Savoie','75':'Paris','76':'Seine-Maritime','77':'Seine-et-Marne','78':'Yvelines','79':'Deux-Sèvres','80':'Somme','81':'Tarn','82':'Tarn-et-Garonne','83':'Var','84':'Vaucluse','85':'Vendée','86':'Vienne','87':'Haute-Vienne','88':'Vosges','89':'Yonne','90':'Territoire de Belfort','91':'Essonne','92':'Hauts-de-Seine','93':'Seine-Saint-Denis','94':'Val-de-Marne','95':"Val-d'Oise",'971':'Guadeloupe','972':'Martinique','973':'Guyane','974':'La Réunion','976':'Mayotte'
};

const COASTAL_DEPTS = new Set(['06','11','13','14','17','22','29','30','33','34','35','40','44','50','56','59','62','64','66','76','80','83','85','2A','2B','971','972','973','974','976']);
const MOUNTAIN_DEPTS = new Set(['04','05','06','09','15','25','26','31','38','39','42','43','48','63','64','65','66','67','68','73','74','88','2A','2B']);
const MEDITERRANEAN_DEPTS = new Set(['04','05','06','11','13','30','34','66','83','84','2A','2B']);
const URBAN_DEPTS = new Set(['59','69','75','92','93','94']);
const WETLAND_DEPTS = new Set(['01','13','17','30','33','34','35','37','41','44','45','49','51','56','67','68','80','85']);
const OVERSEAS_DEPTS = new Set(['971','972','973','974','976']);

const BASE_KEYWORDS = [
  'abeille','bourdon','fourmi','coccinelle','papillon','mouche','moustique','libellule','araignée','escargot','limace',
  'moineau','mésange','merle','rougegorge','pigeon','pie','corneille','étourneau','hirondelle','martinet','pinson','verdier','chardonneret',
  'hérisson','écureuil','renard','chevreuil','sanglier','lièvre','lapin','chauve-souris','fouine','belette','mulot','campagnol','rat','souris',
  'grenouille','crapaud','triton','salamandre','lézard','couleuvre','chien','chat','cheval','âne','vache','mouton','chèvre','poule','canard',
];

const normalizeText = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ');

const getKeywords = (code: string) => {
  const keywords = [...BASE_KEYWORDS];
  if (COASTAL_DEPTS.has(code)) keywords.push('goéland','mouette','cormoran','aigrette','héron','avocette','huîtrier','phoque','crabe','crevette','homard','moule','huître','bar','dorade','sardine','anchois','méduse','oursin','balane');
  if (MOUNTAIN_DEPTS.has(code)) keywords.push('aigle','vautour','marmotte','chamois','bouquetin','isard','mouflon','lynx','loup','tétras','lagopède','truite','apollon','accenteur alpin');
  if (MEDITERRANEAN_DEPTS.has(code)) keywords.push('flamant','cigale','gecko','tortue','lézard ocellé','couleuvre','rollier','guêpier','mérou','murène','dorade','sardine','anchois','scorpion');
  if (URBAN_DEPTS.has(code)) keywords.push('perruche','rat','souris','pigeon','moineau','martinet','corneille','pie','renard','hérisson','fouine','étourneau');
  if (WETLAND_DEPTS.has(code)) keywords.push('canard','cygne','foulque','grèbe','héron','aigrette','grenouille','triton','libellule','agrion','brochet','carpe','ablette');
  if (OVERSEAS_DEPTS.has(code)) keywords.push('iguane','gecko','tortue','colibri','pélican','frégate','crabe','crevette','dauphin','baleine','requin','raie','mérou','perroquet','caméléon');
  return keywords.map(normalizeText);
};

const buildRows = (animals: { name: string; category: string; rarity: string }[], department_code: string) => {
  const keywords = getKeywords(department_code);
  const selected = new Map<string, { animal_name: string; department_code: string }>();
  const localAnimals = animals.filter((animal) => !animal.category.toLowerCase().includes('(monde)'));

  for (const animal of localAnimals) {
    const normalizedName = normalizeText(animal.name);
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      selected.set(animal.name.toLowerCase(), { animal_name: animal.name, department_code });
    }
  }

  const targetSize = OVERSEAS_DEPTS.has(department_code) ? 90 : 140;
  if (selected.size < targetSize) {
    for (const animal of localAnimals.filter((a) => a.rarity === 'common')) {
      if (selected.size >= targetSize) break;
      selected.set(animal.name.toLowerCase(), { animal_name: animal.name, department_code });
    }
  }

  return Array.from(selected.values()).slice(0, 220);
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
    let allAnimals: { name: string; category: string; rarity: string }[] = [];
    let page = 0;
    while (true) {
      const { data } = await supabase
        .from('animals')
        .select('name, category, rarity')
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

    const rows = buildRows(allAnimals, department_code);

    console.log(`[dept ${department_code}] inserting ${rows.length} rows`);

    if (rows.length > 0) {
      const { error: upErr } = await supabase
        .from('animal_departments')
        .upsert(rows, { onConflict: 'department_code,animal_name' });
      if (upErr) console.error(`[dept ${department_code}] upsert error`, upErr);
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
