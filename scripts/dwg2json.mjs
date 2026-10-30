import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web';
import fs from 'fs';
const lib = await LibreDwg.create();
const buf = fs.readFileSync(process.argv[2]);
const data = lib.dwg_read_data(buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.byteLength), Dwg_File_Type.DWG);
if(!data){console.log('fail');process.exit(1)}
const db = lib.convert(data);
fs.writeFileSync(process.argv[3]||'db.json', JSON.stringify(db,(k,v)=>typeof v==='bigint'?Number(v):v));
console.log(Object.keys(db), db.entities?.length, db.tables?.LAYER?.entries?.length);
