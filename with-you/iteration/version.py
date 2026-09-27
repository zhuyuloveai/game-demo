from pathlib import Path
import re,sys
root=Path(__file__).resolve().parent.parent
version=sys.argv[1]
for p in root.glob('*.js'):
 s=p.read_text()
 s=re.sub(r"(from\s*['\"]\./[^'\"?]+\.js)(?:\?v=[^'\"]+)?",lambda m:m[1]+'?v='+version,s)
 p.write_text(s)
p=root/'index.html';s=p.read_text();s=re.sub(r'(app\.js|style\.css)(?:\?v=[^\"]+)?',lambda m:m[1]+'?v='+version,s);p.write_text(s)
