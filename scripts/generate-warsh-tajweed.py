"""Build pinned Warsh al-Azraq annotations; never replace Quranpedia text.
Usage: PYTHONPATH=/path/to/pinned/quranic-phonemizer python scripts/generate-warsh-tajweed.py /path/to/quranpedia-mushaf-4.json.gz
Requires Python >=3.11 and PyYAML. See src/features/quran/data/warsh-tajweed/README.md.
"""
import gzip, hashlib, json, pathlib, sys, unicodedata, subprocess
from quranic_phonemizer import Phonemizer
import quranic_phonemizer

PIN = 'f280f65e2ebca2c3096b620db021952a58d2ec9f'
repo = pathlib.Path(quranic_phonemizer.__file__).resolve().parent.parent
assert subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip() == PIN
out = pathlib.Path(__file__).resolve().parent.parent / 'src/features/quran/data/warsh-tajweed'
out.mkdir(parents=True, exist_ok=True)
reader = Phonemizer(riwayah='warsh')
# Keep colour useful: omit ordinary pronunciation and implementation-only boundary rules.
omit = {'izhar', 'izhar_shafawi', 'lam_qamariyyah', 'tarqeeq', 'tafkheem', 'hamza_wasl_fatha', 'hamza_wasl_kasra', 'hamza_wasl_damma', 'waqf_diacritic_drop', 'waqf_silah_drop', 'waqf_taa_marbuta', 'pausal_alif', 'iltiqa_haraka', 'iltiqa_shortening'}
labels = {'warsh-'+r.id.value: [r.arabic_name, r.name] for r in reader.tajweed_rules if r.id.value not in omit}
(out/'rules.json').write_text(json.dumps(labels,ensure_ascii=False,indent=2)+'\n')
(out/'LICENSE').write_text((repo/'LICENSE').read_text())

def normalized(text):
    chars, positions = [], []
    for i,c in enumerate(text):
        if c.isspace() or c in '\ufeff\u200f۞ـ*': continue
        for d in unicodedata.normalize('NFD', c):
            chars.append(d); positions.append(i)
    return ''.join(chars), positions

with gzip.open(sys.argv[1], 'rt') as f: dump=json.load(f)
report={'commit':PIN,'quranpediaVersion':dump['license']['version'],'scope':'Warsh via al-Azraq; upstream default variants; start/stop at each ayah','included':0,'excluded':{}}
chapters={}
for chapter in dump['data']['surahs']:
    records={}
    for verse in chapter['ayahs']:
        ref=f"{chapter['id']}:{verse['number']}"
        try:
            result=reader.analyse(ref)
            source=result.document('source_view')['source']
            analysis=result.document('analysis_result')['result']
            text=verse['text']
            a,ai=normalized(source['text']); b,bi=normalized(text)
            if a!=b: raise ValueError('Text does not align with Quranpedia')
            mapping={}
            for x,y in zip(ai,bi): mapping.setdefault(x,set()).add(y)
            units={u['id']:u for u in source['units']}
            rules={r['id']:'warsh-'+r['rule_id'] for r in analysis['rule_occurrences']}
            painted=[set() for _ in text]
            # Extend annotations to complete base+diacritic clusters to keep Arabic shaping intact.
            clusters={}; start=0
            for i,c in enumerate(text):
                if not unicodedata.category(c).startswith('M'): start=i
                clusters[i]=start
            ends={}
            for i,start in clusters.items(): ends[start]=i+1
            for placement in source['rule_placements']:
                rule=rules[placement['rule_occurrence_id']]
                if rule not in labels: continue
                for uid in placement['unit_ids']:
                    for lo,hi in units[uid]['ranges']:
                        for x in range(lo,hi):
                            for y in mapping.get(x,[]):
                                if text[y].isspace(): continue
                                for z in range(clusters[y],ends[clusters[y]]): painted[z].add(rule)
            spans=[]
            for i,rs in enumerate(painted):
                if not rs: continue
                rs=sorted(rs)
                if spans and spans[-1][1]==i and spans[-1][2]==rs: spans[-1][1]=i+1
                else: spans.append([i,i+1,rs])
            records[str(verse['number'])]={'hash':hashlib.sha256(text.encode()).hexdigest(),'spans':spans}
            report['included']+=1
        except Exception as e:
            report['excluded'][ref]=f'{type(e).__name__}: {e}'
    chapters[str(chapter['id'])]=records
    print(chapter['id'],report['included'],len(report['excluded']),flush=True)
(out/'annotations.json').write_text(json.dumps(chapters,ensure_ascii=False,separators=(',',':'))+'\n')
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Done',report['included'],'included;',len(report['excluded']),'excluded',flush=True)
