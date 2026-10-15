// Original, hand-built SVG artwork for the little kitchen.
// No fonts, remote assets, emoji, or shared SVG ids are needed.
const ink = '#805261';
const colors = { cream: '#fff8ef', rose: '#e4a2b6', blush: '#f6d2dc', berry: '#b96383', gold: '#edbe72' };
const shadow = '<ellipse cx="41" cy="68" rx="25" ry="5" fill="#805261" opacity=".11" stroke="none"/>';
const art = {
  wheat: `${shadow}
    <path d="M31 67 49 24M39 67 57 35" stroke="#a78949" stroke-width="3"/>
    <path d="M43 40c-9 0-13-7-11-14 8 0 13 6 11 14ZM48 30c-8-1-10-7-8-13 7 1 11 6 8 13ZM50 23c-3-7-1-14 5-18 4 6 2 13-5 18ZM44 40c7 3 14-1 16-8-7-3-13 1-16 8ZM48 30c8 2 14-2 15-9-7-2-13 2-15 9ZM38 51c-8 0-13-6-12-13 8-1 13 5 12 13ZM38 52c8 2 14-1 16-8-7-3-13 0-16 8Z" fill="#efc869"/>
    <path d="m25 64 8-1 6 4-7 4Z" fill="#d87846"/><path d="m31 65-6 6m9-5 2 8" stroke="#d87846" stroke-width="3"/>
    <path d="M27 61c-8-3-11-8-11-14 7 1 12 5 14 10M49 59c7-1 12-5 14-10-7-1-12 2-16 6" fill="#91a278" stroke="#718555"/>
    <path d="m49 15 2-5m-15 21 3 5m18-9-5 2" stroke="#fff2c2" stroke-width="2"/>
  `,
  flour: `${shadow}
    <path d="m25 16 3-8 8 3 8-3 8 3 5-2-3 13 7 32c2 10-2 15-11 16H28c-11 0-14-6-12-15l8-33Z" fill="#f7ecd0"/>
    <path d="M24 22c11 3 21 3 31 0M27 17l1 5m9-7v7m11-7-1 8" fill="none"/>
    <path d="m54 26 6 29c2 8-1 12-8 13H31c20-2 23-7 20-22Z" fill="#e7d7ae" stroke="none"/>
    <path d="M20 48c14-5 25-5 39 0v10c-15-4-25-4-40 0Z" fill="#d87846" stroke="none"/>
    <circle cx="40" cy="45" r="13" fill="#fff8e7"/>
    <path d="m37 53 7-17m-5 12c-5-1-6-4-5-7 4 0 6 3 5 7Zm2-5c5 1 8-2 8-5-4-1-7 2-8 5Z" fill="#eac267" stroke="#a78949" stroke-width="1.8"/>
    <path d="m22 34-2 8m8 17-1 4" stroke="#fffdf1" stroke-width="3"/>
  `,
  dough: `${shadow}
    <ellipse cx="40" cy="61" rx="31" ry="9" fill="#cda46e"/>
    <ellipse cx="40" cy="57" rx="31" ry="8" fill="#e9c591"/>
    <path d="M16 48c0-15 10-28 25-28 14 0 25 12 25 27 0 12-11 17-25 17S16 60 16 48Z" fill="#f3d99d"/>
    <path d="M21 48c3 11 17 12 25 11 11-2 16-7 18-14 3 12-6 19-23 19-14 0-24-4-25-13Z" fill="#deb978" stroke="none"/>
    <path d="M26 37c4-7 10-10 17-9M35 38c-2 4-2 7-1 10M48 38c-1 3-1 7 0 9" fill="none" stroke="#fff2cf" stroke-width="4"/>
    <path d="M23 55h1m4 2h1m24-2h1" stroke="#fff8e7" stroke-width="3"/>
    <ellipse cx="59" cy="64" rx="6" ry="2" fill="#fff8e7" stroke="none"/>
    <path d="M11 66h3m3 4h2m43-4h6" stroke="#e8d9be" stroke-width="2"/>
  `,
  toast: `${shadow}
    <path d="M21 31c-8-6-7-16 3-20 5-2 10-1 15 1 4-2 9-3 14-1 11 3 15 13 6 20v31c0 4-3 7-7 7H28c-5 0-7-3-7-7Z" fill="#bd7844"/>
    <path d="M26 31c-8-5-7-13 1-16 4-2 9-1 13 1 4-2 9-3 13-1 8 3 9 11 1 16v30c0 2-1 3-3 3H29c-2 0-3-1-3-3Z" fill="#f2cc83"/>
    <path d="M30 30c-6-4-5-9 1-11 3-1 6 0 9 2 4-2 7-3 10-2 6 2 8 7 2 11v27c0 2-1 3-3 3H33c-2 0-3-1-3-3Z" fill="#ffe5ad" stroke="none"/>
    <rect x="35" y="35" width="16" height="14" rx="4" fill="#e9b94f" transform="rotate(-10 43 42)" stroke="#c79b44" stroke-width="1.5"/>
    <path d="m37 38 10-2" stroke="#fff0b2" stroke-width="2.5"/>
    <path d="M31 52h1m14 3h1m-11-28h1m13 2h1" stroke="#ddb67b" stroke-width="2.5"/>
  `,
  croissant: `${shadow}
    <path d="M14 53C3 41 12 27 24 24c5-13 26-14 32 0 13 3 22 17 11 29l-11 8c2-7 2-13-3-17-7 8-19 8-26 0-5 4-5 10-3 17Z" fill="#dca34f"/>
    <path d="M24 24c-9 4-14 14-10 24l10 13c-2-9-2-15 3-20Z" fill="#edbd6e"/>
    <path d="M56 24c9 4 14 14 10 24L56 61c2-9 2-15-3-20Z" fill="#edbd6e"/>
    <path d="M25 22c0 11 4 20 9 24l-9 2c-7-6-9-17-6-22Z" fill="#efbb63"/>
    <path d="M55 22c0 11-4 20-9 24l9 2c7-6 9-17 6-22Z" fill="#efbb63"/>
    <path d="M28 19c6-5 18-5 24 0l-5 28c-4 3-10 3-14 0Z" fill="#f4c76f"/>
    <path d="M34 22c5-2 8-2 12-1M33 28l-2 9M21 31l-1 6m39-6 1 6" stroke="#ffe5a5" stroke-width="3" fill="none"/>
    <path d="m12 58-2 3m56 1 3 2" stroke="#d1a15d" stroke-width="2"/>
  `,
  cake: `${shadow}
    <ellipse cx="40" cy="65" rx="31" ry="7" fill="#f1c1d1"/>
    <path d="M17 36h46v23c0 7-46 7-46 0Z" fill="#e4aa6e"/>
    <path d="M18 44c12 4 32 4 44 0v7c-12 4-32 4-44 0Z" fill="#fff5df" stroke="none"/>
    <path d="M18 54c14 4 29 4 44 0" fill="none" stroke="#d17c50" stroke-width="3"/>
    <path d="M17 35c0-10 46-10 46 0v10c-2 5-6 4-7 0-2-3-5-3-7 0-2 5-6 5-8 0-2-3-4-3-6 0-2 4-5 4-7 0-2-3-4-3-5 0-2 5-6 3-6-1Z" fill="#fff8e7"/>
    <ellipse cx="40" cy="34" rx="23" ry="7" fill="#fff8e7"/>
    <path d="M31 25c0-7 5-11 10-11 6 0 11 4 10 11-1 6-6 12-10 12s-10-7-10-12Z" fill="#dc7659"/>
    <path d="m40 18-8-5 7 1 3-7 2 7 7-1-7 6Z" fill="#7e945d"/>
    <path d="M36 23v1m10 0v1m-5 4v1" stroke="#ffe4a1" stroke-width="2"/>
    <circle cx="23" cy="34" r="3" fill="#f1c869" stroke="none"/><circle cx="57" cy="34" r="3" fill="#f1c869" stroke="none"/>
  `,
  spoon: `${shadow}
    <path d="M47 39 26 65c-3 4-10-1-7-5l24-24Z" fill="#c19765"/>
    <path d="M42 38c-7-5-6-15 1-23 7-7 16-9 21-4 6 5 4 14-3 22-6 7-14 10-19 5Z" fill="#bdcac5"/>
    <path d="M47 32c-4-3-3-9 1-14 4-4 9-6 12-3" fill="none" stroke="#eef1e7" stroke-width="3"/>
    <path d="m27 55-4 6" stroke="#e3bd8d" stroke-width="3"/>
    <path d="m41 39 5 4" stroke="#f3ead5" stroke-width="3"/>
  `,
  whisk: `${shadow}
    <path d="M40 42 23 67c-2 3-8-1-6-4l18-25Z" fill="#d87846"/>
    <path d="m23 58-3 5" stroke="#f2b38a" stroke-width="3"/>
    <path d="M37 41C26 24 42 5 56 9c17 4 10 29-16 35Z" fill="#f5efdf" stroke="#879995"/>
    <path d="M37 42C32 24 47 8 55 10M38 42C40 24 51 11 56 10M40 43C57 31 64 17 58 11" stroke="#8e9e98" fill="none"/>
    <path d="m33 39 9 6" stroke="#6f807a" stroke-width="4"/>
    <path d="m43 16 4-3" stroke="#fffdf0" stroke-width="2.5"/>
  `,
  pan: `${shadow}
    <path d="m29 47-16 18c-3 3-8-2-6-5l16-19Z" fill="#b58e61"/>
    <path d="m24 43 7 6" stroke="#47544b" stroke-width="5"/>
    <ellipse cx="47" cy="33" rx="25" ry="24" fill="#5b6b5f" transform="rotate(-15 47 33)"/>
    <ellipse cx="47" cy="31" rx="21" ry="19" fill="#3e4d44" transform="rotate(-15 47 31)"/>
    <path d="M37 23c-7 1-9 7-5 12-3 7 6 12 12 8 6 4 13 0 13-6 8-6 3-14-4-14-5-7-13-6-16 0Z" fill="#fff7dd" stroke="#dbd7bb" stroke-width="1.5"/>
    <circle cx="46" cy="31" r="7" fill="#efbd50" stroke="#d69e3d" stroke-width="1.5"/>
    <path d="M43 28c2-2 4-2 6-1" stroke="#ffe39a" stroke-width="2"/>
    <path d="m12 59 3-3" stroke="#e0b886" stroke-width="2.5"/>
  `,
  pot: `${shadow}
    <path d="M18 35h-7c-7 0-7 13 0 13h8m42-13h7c7 0 7 13 0 13h-8" fill="none" stroke="#8c6848" stroke-width="5"/>
    <path d="M17 31h46v25c0 15-46 15-46 0Z" fill="#d98558"/>
    <path d="M53 33h10v23c0 8-16 12-29 10 15-1 22-6 20-16Z" fill="#be6b44" stroke="none"/>
    <path d="M22 42v12c0 3 2 5 5 6" stroke="#f2b58c" stroke-width="3" fill="none"/>
    <path d="M15 31c0-10 11-16 25-16s25 6 25 16Z" fill="#e7a374"/>
    <path d="M12 31h56" stroke="#8d6549" stroke-width="4"/>
    <path d="M34 15v-3c0-7 12-7 12 0v3" fill="#a27750"/>
    <path d="M24 25c5-4 11-6 18-6" stroke="#ffce9d" stroke-width="3" fill="none"/>
    <path d="M14 18c-3-3 2-4 0-7m49 8c4-4-2-5 1-9" stroke="#b0b69c" fill="none" stroke-width="2"/>
  `,
  mixer: `${shadow}
    <path d="M51 28h11v32H46V31Z" fill="#cc7e9c"/>
    <path d="M54 48h8v12H48Z" fill="#b56684" stroke="none"/>
    <path d="M24 12h29c9 0 14 7 14 16v6H23c-15 0-15-22 1-22Z" fill="#edaac1"/>
    <path d="M19 17c5-2 13-2 20-2" stroke="#ffe1eb" stroke-width="3"/>
    <path d="M29 35v9m-5-7v7c0 5 10 5 10 0v-7" fill="none" stroke="#879993" stroke-width="2.5"/>
    <path d="M14 44h35l-4 14c-2 8-24 8-27 0Z" fill="#d4dcd1"/>
    <path d="M21 48c1 5 1 9 5 11" stroke="#fff8e7" stroke-width="3"/>
    <path d="M17 62h44c6 0 8 5 8 8H10c0-4 2-8 7-8Z" fill="#d88ea9"/>
    <circle cx="55" cy="24" r="4" fill="#e9bb64"/><path d="M54 23h2" stroke="#fff4c9" stroke-width="2"/>
  `,
  oven: `${shadow}
    <rect x="9" y="14" width="62" height="55" rx="8" fill="#e6a3b7"/>
    <path d="M11 21c0-4 3-6 7-6h44c5 0 8 3 8 7v8H10Z" fill="#f6c4d3"/>
    <path d="M10 30h60" stroke="#b9728d"/>
    <rect x="17" y="36" width="46" height="26" rx="4" fill="#665c4a"/>
    <rect x="21" y="40" width="38" height="17" rx="2" fill="#9f8b65" stroke="none"/>
    <path d="M27 54c-2-9 6-12 10-8 5-6 13-2 12 8Z" fill="#e1ad61" stroke="#c39456" stroke-width="1.5"/>
    <path d="m31 47 2 3m8-3 2 3" stroke="#fbe1a3" stroke-width="1.5"/>
    <path d="M22 36h36" stroke="#f7e8cb" stroke-width="4"/>
    <circle cx="21" cy="22" r="3" fill="#a85d7a"/><circle cx="32" cy="22" r="3" fill="#a85d7a"/>
    <rect x="49" y="20" width="13" height="5" rx="2" fill="#b56d8b" stroke="none"/>
    <path d="M17 69v3m47-3v3" stroke-width="4"/>
  `,
  basket: `${shadow}
    <path d="M19 39c0-39 42-39 42 0" fill="none" stroke="#9b754e" stroke-width="7"/>
    <path d="M19 37c0-36 42-36 42 0" fill="none" stroke="#e1b982" stroke-width="3"/>
    <path d="m47 35 7-18c3-7 12-4 10 3l-9 24Z" fill="#efbb72"/>
    <path d="m55 21 5 2m-7 5 5 2" stroke="#c0884f" stroke-width="2"/>
    <path d="m20 41-1-16c1-6 9-7 11 0l4 16Z" fill="#e89054"/>
    <path d="m23 24-8-8 8 3 2-10 4 10 7-4-6 10" fill="#91a278" stroke="#728252"/>
    <circle cx="40" cy="34" r="10" fill="#d97859"/>
    <path d="m40 28-5-5 5 2 4-5-1 6 5 1Z" fill="#718652" stroke="#718652"/>
    <path d="M12 37h56l-7 26c-2 8-40 8-42 0Z" fill="#dea0b1"/>
    <path d="m24 40 4 24m9-24 1 26m11-26-1 26m12-26-4 24M16 48h48M18 58h44" stroke="#b9768c" stroke-width="2"/>
    <rect x="10" y="34" width="60" height="8" rx="4" fill="#f4c7d4"/>
    <path d="M28 48h24v12H28Z" fill="#fff4ee" stroke="#ad6b82"/>
    <path d="m35 55 4 3 7-7" fill="none" stroke="#91a278" stroke-width="3"/>
  `,
  utensils: `${shadow}
    <path d="m27 45-8-22c-12-4-11-17-4-20 8-3 15 7 8 17l9 23Z" fill="#d3a66f"/>
    <path d="m18 7 3 7" stroke="#f0cea0" stroke-width="2.5"/>
    <path d="m42 45 3-24-7-2 1-15 17 2-2 15-7 1-2 23Z" fill="#bbcac0"/>
    <path d="m44 8-1 8m6-8-1 8" stroke="#84988b" stroke-width="2"/>
    <path d="m52 45 7-18c-5-5-4-14 1-17 6-4 13 0 12 7-1 6-5 10-10 11l-7 18Z" fill="#f1d4a3"/>
    <path d="m63 14-3 8m7-6-4 7" stroke="#ac8b62" stroke-width="1.5"/>
    <path d="M19 35h43l-4 29c-1 8-34 8-35 0Z" fill="#e2a1b7"/>
    <path d="M54 38h7l-4 26c-1 4-8 6-17 5 9-2 12-8 12-15Z" fill="#c77f9b" stroke="none"/>
    <path d="m27 43 2 16" stroke="#ffe0e9" stroke-width="3"/>
    <ellipse cx="40" cy="36" rx="22" ry="5" fill="#efbfd0"/>
    <path d="M37 54c-7-7 3-12 5-5 3-7 12-2 4 5l-4 4Z" fill="#fff1e6" stroke="none"/>
  `,
  chef: `${shadow}
    <path d="M26 45c-8 7-10 17-5 24h37c7-11 0-22-9-27Z" fill="#fff8e7"/>
    <path d="M54 51c5 2 9 7 10 11l-9 4" fill="#f4dce4"/>
    <path d="M30 44c-5-5-6-13-3-19 4-8 19-10 25-1 4 6 3 15-2 20l-3 10-15-1Z" fill="#fffdf1"/>
    <path d="M49 33c7-2 15 2 16 5-1 4-10 6-17 2Z" fill="#edb75e"/>
    <path d="m52 37 9 1" stroke="#c38f45" stroke-width="1.5"/>
    <circle cx="43" cy="31" r="2" fill="#514838" stroke="none"/>
    <ellipse cx="44" cy="38" rx="3" ry="2" fill="#ecc0a4" stroke="none"/>
    <path d="M27 25v-8c-8-4-6-14 2-14 4-5 12-4 15 0 9-4 16 6 11 12l-3 10Z" fill="#fffdf4"/>
    <path d="M28 20h24m-17-8 1 6m9-8-1 8" stroke="#e9d5dd" stroke-width="2"/>
    <path d="m29 46 20 2-7 10-13-8Z" fill="#cb7695"/>
    <path d="m38 54-1 10 6-2 3-7" fill="#cb7695"/>
    <path d="M25 58c-1 5 3 8 8 7" stroke="#dec4cf" fill="none"/>
  `,
  coin: '<circle cx="40" cy="40" r="27" fill="#dda349"/><circle cx="40" cy="38" r="25" fill="#f0c566"/><circle cx="40" cy="38" r="18" fill="none" stroke="#c99744"/><path d="m40 25 4 8 9 1-6 7 1 9-8-4-8 4 1-9-6-7 9-1Z" fill="#ffe4a0" stroke="#c99744" stroke-width="1.5"/><path d="M23 28c3-5 7-7 12-8" stroke="#fff0bc" stroke-width="3" fill="none"/>',
  energy: '<path d="M45 8 19 43h18l-3 29 27-39H43Z" fill="#eab551"/><path d="m42 17-16 22h16l-3 18 15-21H39Z" fill="#ffda83" stroke="none"/>',
  star: '<path d="m40 8 10 20 23 4-17 16 4 23-20-11-20 11 4-23L7 32l23-4Z" fill="#f0c566"/><path d="m40 17 7 16 17 2-15 5-9-10-10 9-12-4 16-2Z" fill="#ffe7a4" stroke="none"/>',
  leaf: '<path d="M19 60C7 34 28 14 64 14c5 32-15 51-41 46Z" fill="#91a278"/><path d="M15 68 52 28M28 55l-2-18m14 6 17-1" fill="none" stroke="#64734c" stroke-width="3"/>',
  lock: '<path d="M26 35V25c0-19 28-19 28 0v10" fill="none" stroke="#baa0af" stroke-width="7"/><rect x="17" y="32" width="46" height="36" rx="9" fill="#dbc5d0"/><circle cx="40" cy="47" r="5" fill="#956c80" stroke="none"/><path d="M40 50v7" stroke="#956c80" stroke-width="5"/>',
  sound: '<path d="m34 21-13 12H12v16h9l13 12Z" fill="#de9cb5"/><path d="M46 28c10 6 10 18 0 24m10-32c18 10 18 32 0 42" fill="none" stroke-width="4"/>',
  muted: '<path d="m34 21-13 12H12v16h9l13 12Z" fill="#d8bec9"/><path d="m47 30 20 20m0-20L47 50" fill="none" stroke-width="4"/>',
  help: '<circle cx="40" cy="40" r="25" fill="#fff8e7"/><path d="M31 31c0-12 20-12 20 0 0 8-11 7-11 16" fill="none" stroke-width="4"/><circle cx="40" cy="56" r="2.5" fill="#66513d" stroke="none"/>',
  settings: '<path d="m34 12 12 0 2 8 8 5 8-2 6 10-6 6v8l6 6-6 10-8-2-8 5-2 8H34l-2-8-8-5-8 2-6-10 6-6v-8l-6-6 6-10 8 2 8-5Z" fill="#f1d7e1" transform="translate(0 -3) scale(1 .96)"/><circle cx="40" cy="39" r="10" fill="#fff8e7"/>',
  arrow: '<path d="M17 40h44M44 23l17 17-17 17" fill="none" stroke-width="5"/>',
  check: '<path d="m19 40 14 14 28-30" fill="none" stroke="#b55f83" stroke-width="7"/>',
  close: '<path d="m24 24 32 32m0-32L24 56" fill="none" stroke-width="5"/>',
  book: '<path d="M40 24C30 17 20 16 10 20v42c12-4 21-3 30 3 10-6 19-7 30-3V20c-10-4-20-3-30 4Z" fill="#f8e1e9"/><path d="M40 24v41M18 30c5-1 10 0 15 2m-15 8c5-1 10 0 15 2m14-10c5-2 10-3 15-2m-15 12c5-2 10-3 15-2" fill="none" stroke="#b88b9f" stroke-width="2.5"/>',
  trash: '<path d="m23 29 3 33c1 8 27 8 28 0l3-33" fill="#ecc8d6"/><path d="M19 25h42M32 24v-8h16v8m-14 13 1 21m11-21-1 21" fill="none" stroke-width="3.5"/>',
  refresh: '<path d="M61 34c-3-17-25-23-38-11-12 12-7 32 7 38 14 6 29-3 31-15M61 17v18H44" fill="none" stroke="#b55f83" stroke-width="4"/>',
  sparkles: '<path d="m35 13 7 18 18 7-18 7-7 18-7-18-18-7 18-7Z" fill="#f0c566"/><path d="m62 8 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm0 44 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#e2a765" stroke="none"/>',
};


// Each item has an original silhouette and details at the 80px board scale.
Object.assign(art, {
  carrot: `${shadow}<path d="M49 24c-7-7-19-2-20 8L18 67c-1 4 4 5 7 2l32-28c8-7 1-19-8-17Z" fill="#f3a05f"/><path d="m37 38 8 5m-16 4 7 4m-12 4 5 3" stroke="#d57a49"/><path d="m47 25-3-15 8 9 5-15 1 16 12-7-13 17Z" fill="#86aa73"/><path d="m33 33-9 25" stroke="#ffd2a0" stroke-width="3"/>`,
  tomato: `${shadow}<path d="M40 25c-18-10-31 5-29 23 2 19 18 24 29 18 11 6 27 0 29-18 2-18-11-33-29-23Z" fill="#e77d7b"/><path d="M21 37c-4 3-6 8-5 13" stroke="#ffb6a5" stroke-width="4"/><path d="m40 29-15-5 12-2 1-12 6 11 13-3-9 9 9 6-14-1-6 9Z" fill="#88a474"/><path d="M39 21c0-6 4-10 9-12" stroke="#6f8b59" stroke-width="3"/>`,
  broccoli: `${shadow}<path d="m29 45 5 23h16l2-24-12 4Z" fill="#a3bb7c"/><path d="M40 64V41m0 15-11-12m11 9 13-10" stroke="#708d59" stroke-width="3"/><path d="M18 49c-12-4-14-21-1-26-2-12 12-20 22-13 10-9 26-1 25 12 16 4 14 23 1 28-5 7-16 5-23 0-8 7-19 6-24-1Z" fill="#80a978"/><path d="M22 23c4-5 9-5 13-1m12-5c5-2 10 2 10 6m-43 14c0-5 4-8 8-8m29 9c4-4 11-2 12 2" fill="none" stroke="#b7cf96" stroke-width="3"/>`,
  salad: `${shadow}<ellipse cx="40" cy="42" rx="31" ry="11" fill="#fff5e9"/><path d="M10 40c1 21 11 30 30 30s29-9 30-30Z" fill="#efb2c6"/><path d="M17 39c-8-7-3-17 5-16-3-11 10-16 16-8 8-11 21-4 18 6 12-3 17 10 8 17Z" fill="#9cb880"/><path d="m22 28 9 7m12-15-3 15m12-7-8 9" stroke="#6f9363"/><circle cx="27" cy="35" r="7" fill="#e68579"/><circle cx="53" cy="33" r="8" fill="#e7887c"/><path d="m37 32 8 2-2 9-9-3Z" fill="#fff0b2"/><ellipse cx="40" cy="41" rx="30" ry="7" fill="none"/><path d="M20 50c2 7 6 11 12 13" stroke="#ffe8f0" stroke-width="3"/>`,
  roastveg: `${shadow}<path d="M13 29h54l5 30c-4 11-60 11-64 0Z" fill="#c6879e"/><ellipse cx="40" cy="29" rx="27" ry="12" fill="#fff3df"/><path d="m20 25 8-8 12 5-6 12-13 1Z" fill="#eaa25d"/><path d="m46 20 12 3 6 10-14 6-7-8Z" fill="#c88c65"/><circle cx="36" cy="36" r="8" fill="#e38274"/><path d="m52 36 8-4m-34-6 5 2m13 1 6-2" stroke="#9f674f" stroke-width="2.5"/><path d="M17 20c-3-4 3-6 1-11m21 5c-3-4 4-6 1-10m20 13c-3-4 3-6 1-10" fill="none" stroke="#d9b7c2"/><path d="M16 48h48" stroke="#f6c7d5" stroke-width="3"/>`,
  veggieplatter: `${shadow}<ellipse cx="40" cy="53" rx="34" ry="15" fill="#d9a1b9"/><ellipse cx="40" cy="48" rx="34" ry="15" fill="#fff4ea"/><path d="m15 43 15-19 10 7-17 20Z" fill="#eaa56c"/><path d="m23 35 6 5m-2-10 6 5" stroke="#ba7952"/><path d="M42 43c-9-3-10-14-3-17-3-8 8-13 12-6 9-5 17 4 12 11 8 7 1 16-7 13Z" fill="#8ba976"/><circle cx="31" cy="48" r="8" fill="#e7847c"/><circle cx="48" cy="53" r="8" fill="#e6b160"/><path d="m46 50 4 6m-6-2 8-2" stroke="#fff0af"/><path d="m61 50 7-7m-52 8-5 6" stroke="#8da271" stroke-width="3"/><path d="M36 15v-5m-7 8-4-3m18 3 4-3" stroke="#e6b765"/>`,
  apple: `${shadow}<path d="M40 26c-16-12-29-1-29 17 0 17 12 29 25 24l4-2 4 2c13 5 25-7 25-24 0-18-13-29-29-17Z" fill="#df8290"/><path d="M40 27c-1-9 2-15 7-20" stroke="#9e7451" stroke-width="4"/><path d="M44 20c1-12 13-15 19-9-2 9-10 12-19 9Z" fill="#91a977"/><path d="M24 32c-6 5-7 14-4 22" stroke="#ffc4ca" stroke-width="4"/><path d="M35 30c4 3 8 3 12 0" fill="none" stroke="#c7677e"/>`,
  orange: `${shadow}<circle cx="39" cy="43" r="28" fill="#edb368"/><path d="M38 15c3-12 18-15 26-9-5 11-16 14-26 9Z" fill="#92ac77"/><path d="m39 16 7-9" stroke="#6c8757"/><path d="M24 25c-7 5-10 12-9 19" stroke="#ffdb9d" stroke-width="4"/><path d="M27 50h.1m8 8h.1m14-7h.1m7-15h.1m-24-8h.1" stroke="#d18f4a" stroke-width="2.5"/><path d="M49 46c13-2 23 3 24 16-13 7-27 4-30-7Z" fill="#fff0cb"/><path d="m52 49 13 11-17-5m6-6 11 11 2-11" fill="#f3bb75" stroke="#ffdfaa" stroke-width="2"/>`,
  strawberry: `${shadow}<path d="M16 26c6-12 17-11 24-5 7-6 18-7 24 5 9 19-16 45-24 45S7 45 16 26Z" fill="#e8839e"/><path d="m39 25-17-9 14 2 4-12 4 12 14-2-15 10Z" fill="#89a878"/><path d="m26 31 2 3m11-6 1 4m12-2 1 4M22 42l3 3m10-5 1 4m12-3-1 4m9-3-2 3M30 53l3 3m10-4-1 4m-5 5 2 3" stroke="#ffe7b7" stroke-width="2.5"/><path d="M22 29c-3 3-4 6-3 10" stroke="#ffc7d3" stroke-width="3"/>`,
  fruitbowl: `${shadow}<path d="M11 39h58l-7 20c-4 13-40 13-44 0Z" fill="#e9abc2"/><ellipse cx="40" cy="38" rx="29" ry="8" fill="#fff0dc"/><circle cx="28" cy="29" r="13" fill="#e9b267"/><path d="M44 35c-14-11-10-23-1-24 7-1 15 8 20 4 3 15-6 22-19 20Z" fill="#f5d47d"/><path d="M47 33c-1-10 9-16 16-8 8 11-4 17-10 19Z" fill="#e7869d"/><path d="m54 27 1 3m5 3-1 3m-5 2 1 2" stroke="#ffe4b2"/><path d="m24 16 7-7" stroke="#819c6c" stroke-width="4"/><path d="M20 47c3 7 7 10 14 11" stroke="#ffe4ed" stroke-width="3"/>`,
  jam: `${shadow}<rect x="20" y="20" width="41" height="49" rx="9" fill="#c97997"/><path d="M25 31h31v29c0 5-31 5-31 0Z" fill="#dd8eac" stroke="none"/><rect x="16" y="14" width="49" height="12" rx="4" fill="#f8decb"/><path d="m19 15 8 10m2-10 8 10m2-10 8 10m2-10 8 10" stroke="#d89eb4" stroke-width="3"/><path d="m15 23 4 10 9-4 11 5 11-5 11 4 5-10Z" fill="#f7d5df"/><rect x="25" y="39" width="31" height="20" rx="5" fill="#fff4e6"/><path d="M34 44c3-4 6-1 7 0 2-2 6-3 8 0 3 5-5 11-8 12-3-2-10-8-7-12Z" fill="#e3839e"/><path d="m41 44-4-5 5 1 4-2-1 6" fill="#8aa877"/><path d="M26 34v3" stroke="#ffd9e6" stroke-width="3"/>`,
  fruittart: `${shadow}<path d="m9 42 6 18c4 12 46 12 51 0l6-18Z" fill="#dca46c"/><path d="m17 47 3 13m7-11 2 14m10-14v15m10-15-2 14m13-16-3 13" stroke="#b87b55"/><ellipse cx="40" cy="40" rx="32" ry="16" fill="#f5cf92"/><ellipse cx="40" cy="38" rx="26" ry="12" fill="#fff0d4"/><path d="M19 32c4-9 15-7 16 1 0 9-14 12-16-1Zm26-7c4-8 14-5 14 2 0 9-13 12-14-2Z" fill="#e9869f"/><path d="m25 30 1 3m4-1-1 3m22-10 1 3m2 3-1 2" stroke="#ffe9b9"/><circle cx="46" cy="41" r="7" fill="#e7b16c"/><circle cx="30" cy="43" r="4" fill="#8e83ac"/><circle cx="37" cy="29" r="4" fill="#8e83ac"/><path d="m58 41 7-9-1 12Z" fill="#91ab77"/>`,
  beans: `${shadow}<path d="M21 34c-10-15 2-31 16-29 15 3 19 23 6 33-7 6-16 5-22-4Z" fill="#a57960"/><path d="M36 8c-12 8 3 17-11 27" stroke="#624b47" stroke-width="3"/><path d="M41 57c-8-15 5-31 20-27 14 4 16 24 3 33-8 5-18 3-23-6Z" fill="#9d6b5d"/><path d="M60 32c-13 6 1 18-14 27" stroke="#61494b" stroke-width="3"/><path d="M12 60c-6-10 2-22 13-20 11 2 15 15 6 23-5 5-14 4-19-3Z" fill="#bf8c68"/><path d="M24 43c-9 5 2 11-9 17" stroke="#805754" stroke-width="2.5"/><path d="m26 14 3-2m22 26 3-2" stroke="#dfb18d" stroke-width="3"/>`,
  coffee: `${shadow}<ellipse cx="37" cy="65" rx="29" ry="7" fill="#eac2d2"/><path d="M58 31h7c15 0 13 23 0 23h-9" fill="none" stroke="#b77d98" stroke-width="6"/><path d="M14 27h46v26c0 18-46 18-46 0Z" fill="#f6d6e2"/><ellipse cx="37" cy="28" rx="23" ry="7" fill="#7d584c"/><path d="M20 28c10-4 23-4 33 0" stroke="#ba8a6c" stroke-width="2"/><path d="M23 40v12c0 3 3 6 6 7" stroke="#fff4ed" stroke-width="3"/><path d="M28 17c-6-6 4-7 0-13m18 14c-6-6 4-7 0-13" stroke="#d3a5b7"/>`,
  milkcoffee: `${shadow}<path d="M23 16h36l-4 49c-2 8-26 8-28 0Z" fill="#f7ddcd"/><path d="m26 35 2 28c2 6 23 6 25 0l2-28Z" fill="#b9856b"/><path d="m27 45 1 15c5 7 19 3 26-6l1-19c-10 10-17-1-28 10Z" fill="#e6ba91" stroke="none"/><ellipse cx="41" cy="17" rx="18" ry="6" fill="#fff1df"/><ellipse cx="41" cy="34" rx="15" ry="4" fill="#f9ddba" stroke="none"/><path d="m32 22 2 33" stroke="#fffaf1" stroke-width="3"/><path d="m49 18 8-15" stroke="#b87793" stroke-width="4"/>`,
  latte: `${shadow}<ellipse cx="37" cy="65" rx="31" ry="7" fill="#e9b7ca"/><path d="M58 31h6c15 0 13 23 0 23h-9" fill="none" stroke="#c0859f" stroke-width="5"/><path d="M12 30h49l-5 22c-3 17-35 17-39 0Z" fill="#e2a1b9"/><ellipse cx="37" cy="30" rx="25" ry="10" fill="#b77f5e"/><path d="M37 35c-19-8-6-17 0-8 7-9 19 0 0 8Z" fill="#fff0d6" stroke="none"/><path d="M24 43c2 8 5 12 12 13" stroke="#ffd9e7" stroke-width="3"/><path d="M29 16c-5-5 3-7 0-12m18 12c-5-5 3-7 0-12" stroke="#d1a2b4"/>`,
  icedcoffee: `${shadow}<path d="m21 21 6 44c2 7 25 7 27 0l6-44Z" fill="#e9c6b1"/><path d="m24 36 3 27c2 5 25 5 27 0l4-27Z" fill="#aa775f"/><path d="m26 50 2 13c4 5 20 5 25 0l3-22c-11 12-20-4-30 9Z" fill="#d7ab86" stroke="none"/><ellipse cx="40" cy="21" rx="20" ry="6" fill="#c99d80"/><path d="m29 27 9-2 3 10-10 3Zm15 7 10-3 1 11-10 2Z" fill="#f4dfcb" stroke="#f9e9d9" opacity=".9"/><path d="m46 35 8-29h13" stroke="#c47f9c" stroke-width="4"/><path d="m29 41 2 15" stroke="#fff0e6" stroke-width="2.5"/>`,
  coffeetower: `${shadow}<ellipse cx="40" cy="67" rx="34" ry="6" fill="#e5b3c5"/><path d="M13 46h25v14c0 9-25 9-25 0Zm29 0h25v14c0 9-25 9-25 0Z" fill="#e5a5be"/><path d="M25 23h30v16c0 12-30 12-30 0Z" fill="#f2cfdd"/><path d="M38 48h5m25 3c10-2 9 10 0 10M55 28c11-2 11 12 0 13" fill="none" stroke="#bd7e98" stroke-width="3"/><ellipse cx="40" cy="24" rx="15" ry="5" fill="#b68365"/><ellipse cx="25" cy="46" rx="12" ry="4" fill="#8f6657"/><ellipse cx="54" cy="46" rx="12" ry="4" fill="#8f6657"/><path d="M40 27c-9-5-4-9 0-5 4-4 9 0 0 5Z" fill="#fff1d9" stroke="none"/><path d="m18 10 2 6 6 2-6 2-2 6-2-6-6-2 6-2Zm44-5 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#e7ba70" stroke="none"/>`,
  saucer: `${shadow}<ellipse cx="40" cy="46" rx="33" ry="20" fill="#e6b1c5"/><ellipse cx="40" cy="41" rx="33" ry="20" fill="#fff3e9"/><ellipse cx="40" cy="41" rx="23" ry="12" fill="#f6dbe4"/><ellipse cx="40" cy="41" rx="15" ry="7" fill="#fff4ec"/><path d="M18 36c4-5 9-7 14-8" stroke="#e6b3c6" stroke-width="3"/><path d="m40 36 2 4 5 1-4 2 1 4-4-2-4 2 1-4-4-2 5-1Z" fill="#dfb574" stroke="none"/>`,
  bowl: `${shadow}<path d="M10 33h60l-7 23c-4 17-42 17-46 0Z" fill="#e1a0b8"/><path d="M28 66h24v4H28Z" fill="#cb88a3"/><ellipse cx="40" cy="33" rx="30" ry="11" fill="#fff4eb"/><ellipse cx="40" cy="33" rx="22" ry="6" fill="#f6d8e2" stroke="#deb2c4"/><path d="M22 47c3 8 7 12 13 13" stroke="#ffe2ec" stroke-width="3"/><path d="m47 47 3 4 4-1-1 5-4 2-3-4Z" fill="#fff2d3" stroke="none"/>`,
  plate: `${shadow}<circle cx="40" cy="39" r="31" fill="#efd0dc"/><circle cx="40" cy="39" r="25" fill="#fff5ea"/><circle cx="40" cy="39" r="19" fill="none" stroke="#e3b4c7"/><path d="M22 23c4-5 9-8 15-8" stroke="#fff6ef" stroke-width="3"/><path d="M46 33c-9-6-17 4-9 10 9 5 16-2 9-10Z" fill="#efbdcb" stroke="none"/><path d="m40 35-3-9m1 4c-7 2-11-2-10-6 6-1 9 2 10 6Zm0 1c2-7 8-8 11-4-2 5-5 6-11 4Z" fill="#96ad82" stroke="#7d986b" stroke-width="1.5"/>`,
  teapot: `${shadow}<path d="M57 31c22-8 25 18 7 24" fill="none" stroke="#c58a9f" stroke-width="6"/><path d="M26 35c-10 0-12-7-17-12 0 16 5 29 18 30" fill="#f0c0d1"/><path d="M23 34c1-17 33-17 37 0l7 22c-2 17-49 17-52 0Z" fill="#e5a6bd"/><ellipse cx="40" cy="29" rx="18" ry="6" fill="#f5d0de"/><path d="M34 24v-5c0-6 12-6 12 0v5" fill="#ecc1d1"/><path d="M28 42c-4 4-5 9-4 14" stroke="#ffdce8" stroke-width="3"/><path d="M42 50c-12-10 3-14 4-5 2-9 14-5 4 5l-4 4Z" fill="#fff1dc" stroke="none"/>`,
  teaSet: `${shadow}<ellipse cx="40" cy="62" rx="35" ry="9" fill="#d9a1b8"/><ellipse cx="40" cy="59" rx="35" ry="8" fill="#fff1e5"/><path d="M23 25c-7-1-9-5-12-9 0 12 4 20 12 23m30-17c15-5 18 13 5 17" fill="#f2bfd2"/><path d="M22 25c1-12 27-12 30 0l7 20c0 12-45 12-45 0Z" fill="#e6a5bf"/><ellipse cx="37" cy="22" rx="14" ry="5" fill="#f6d7e2"/><path d="M34 18v-5h7v5" fill="#e5b478"/><path d="M5 48h21v10c0 8-21 8-21 0Zm47 0h22v10c0 8-22 8-22 0Z" fill="#f6d9e4"/><ellipse cx="15" cy="48" rx="10" ry="4" fill="#b58366"/><ellipse cx="63" cy="48" rx="10" ry="4" fill="#b58366"/><path d="M26 51c8-1 8 7 0 7M40 33c-6-6-10 1-3 5l3 2 3-2c7-4 3-11-3-5Z" fill="#fff3df"/>`,
  banquet: `${shadow}<path d="M9 53h62l-4 17H13Z" fill="#d99bb3"/><ellipse cx="40" cy="51" rx="34" ry="9" fill="#fff1df"/><path d="M13 47h54c0-19-10-30-27-30S13 28 13 47Z" fill="#e3adbd"/><path d="M20 43c1-13 8-20 19-21" stroke="#ffe0e8" stroke-width="3"/><path d="M35 17v-4c0-6 10-6 10 0v4" fill="#e9bc72"/><path d="M10 47h60" stroke="#b27791" stroke-width="4"/><path d="m40 27 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#fff0cb" stroke="none"/><path d="m9 16 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm59-9 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#edbd73" stroke="none"/>`,
  sponge: `${shadow}<path d="m13 25 48-7 9 11-3 27-47 8-9-10Z" fill="#e7b568"/><path d="m13 25 48-7 9 11-48 8Z" fill="#a9bb92"/><path d="m22 37 48-8-3 27-47 8Z" fill="#f5cc7b"/><path d="m20 23 8 7m3-9 8 7m3-9 8 7m3-9 8 7" stroke="#82976f"/><path d="m30 45 .1 .1m12 8 .1 .1m12-13 .1 .1m-24 13 .1 .1m28-2 .1 .1" stroke="#ce9b50" stroke-width="4"/><circle cx="12" cy="13" r="5" fill="#fae5ef"/><circle cx="69" cy="9" r="4" fill="#fae5ef"/>`,
  spray: `${shadow}<path d="M32 28h20l11 30c3 13-41 13-40 0Z" fill="#ecb3c9"/><rect x="34" y="21" width="16" height="10" rx="2" fill="#c187a1"/><path d="M31 9h32v10H47l-5 7H30Z" fill="#f3d2df"/><path d="m52 19-1 14" stroke="#b47896" stroke-width="5"/><rect x="28" y="43" width="28" height="17" rx="5" fill="#fff2e3"/><path d="m42 46 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#d595b0" stroke="none"/><path d="m67 10 6-3m-5 8h7m-8 5 6 3" stroke="#d9b7ca"/><path d="M31 34 27 45" stroke="#ffe6ee" stroke-width="3"/>`,
  brush: `${shadow}<path d="M26 43 54 9c5-6 14 1 10 7L39 52Z" fill="#dba3b8"/><path d="m55 15 3-3" stroke="#ffe0eb" stroke-width="3"/><path d="M20 38c7-2 20 5 24 13l-13 17c-8 0-19-6-24-13Z" fill="#c49a75"/><path d="m7 55 11-14 25 12-12 15Z" fill="#f0d4aa"/><path d="m12 54 15 8m-11-13 16 8m-12-13 16 8" stroke="#bd946e"/><path d="m13 57-3 6m10-3-3 7m10-4-2 7" stroke="#c6a17a" stroke-width="3"/><path d="m57 42 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#ecd09b" stroke="none"/>`,
  mop: `${shadow}<path d="m34 49 20-40" stroke="#ba829b" stroke-width="7"/><path d="m35 46 18-37" stroke="#efd0dd" stroke-width="3"/><path d="m26 40 16 6-4 12-17-5Z" fill="#d990af"/><path d="M23 49c-7 1-10 8-14 18 4 3 8 2 11 0 3 5 7 5 10 1 5 5 9 3 11-1 5 1 8-1 8-5l-13-8Z" fill="#f3e7d9"/><path d="m25 54-9 13m13-12-5 14m9-13 1 13m3-11 6 9" stroke="#d5bbbc"/><path d="m58 46 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#e7bd7b" stroke="none"/>`,
  bucket: `${shadow}<path d="M17 33c0-31 46-31 46 0" fill="none" stroke="#b68a9f" stroke-width="5"/><path d="m12 32 8 31c3 12 37 12 41 0l8-31Z" fill="#d99bb5"/><ellipse cx="40" cy="32" rx="28" ry="9" fill="#f8dae5"/><ellipse cx="40" cy="32" rx="22" ry="5" fill="#d2e3e9" stroke="#a3c2cf"/><path d="M24 44 28 59" stroke="#ffe0eb" stroke-width="3"/><rect x="31" y="6" width="18" height="6" rx="3" fill="#f3c5d7"/><path d="m46 44 3 5 6 1-4 4 1 6-6-3-5 3 1-6-4-4 6-1Z" fill="#fff0d2" stroke="none"/><circle cx="60" cy="17" r="4" fill="#f8e7ee"/>`,
  cleaner: `${shadow}<path d="M15 57c2-11 8-18 22-18h12c12 0 20 8 20 20v7H15Z" fill="#e5a7c1"/><path d="M21 52c6-7 15-8 24-7" stroke="#ffdeeb" stroke-width="3"/><circle cx="27" cy="65" r="7" fill="#9d728a"/><circle cx="58" cy="65" r="7" fill="#9d728a"/><circle cx="27" cy="65" r="3" fill="#f5d6e3"/><circle cx="58" cy="65" r="3" fill="#f5d6e3"/><path d="M50 40c-2-25-27-26-27-8v7" fill="none" stroke="#b888a1" stroke-width="6"/><path d="m23 24-9-13" stroke="#b888a1" stroke-width="7"/><path d="m6 15 15-8" stroke="#d8a9bf" stroke-width="7"/><circle cx="51" cy="54" r="5" fill="#fff0d6"/><path d="m61 12 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#e9bd78" stroke="none"/>`,
  seed: `${shadow}<path d="M21 12h38v55H21Z" fill="#f5dfbc"/><path d="M21 12h38v10H21Zm0 45h38v10H21Z" fill="#e6abc0"/><path d="m26 16 4 2 4-2 4 2 4-2 4 2 4-2 4 2" stroke="#fff0e6"/><ellipse cx="40" cy="40" rx="12" ry="14" fill="#fff3dd" stroke="#d5b793"/><path d="M40 49V34m0 7c-11 0-11-10-4-10 5 1 4 10 4 10Zm0-5c0-9 8-12 11-6-1 5-6 7-11 6Z" fill="#91ad7d" stroke="#739361"/><path d="m28 60 2 3m8-3 2 3m8-3 2 3" stroke="#b97692"/>`,
  sprout: `${shadow}<ellipse cx="40" cy="61" rx="26" ry="9" fill="#c39470"/><ellipse cx="40" cy="57" rx="26" ry="8" fill="#e0b689"/><path d="M40 57V29" stroke="#7f9e69" stroke-width="4"/><path d="M40 41C18 43 12 27 18 20c14-1 24 7 22 21Z" fill="#a1bd87"/><path d="M40 32c-2-16 12-25 22-19 2 13-6 21-22 19Z" fill="#90ad7a"/><path d="m40 41-16-14m16 5 15-12" stroke="#769664"/><path d="m23 59 1 1m8 4 1 1m23-5 1 1" stroke="#b88b65" stroke-width="2.5"/>`,
  basil: `${shadow}<path d="M41 68V16M41 50 23 37m18 21 19-15m-19-8L29 21" stroke="#71925e" stroke-width="3"/><path d="M40 45C16 48 7 32 15 23c16-2 28 7 25 22Zm2 12c0-22 18-33 28-23 1 16-11 25-28 23ZM39 29C22 29 16 16 23 9c12 0 19 7 16 20Zm2 9c-1-18 13-29 23-21 2 13-9 23-23 21Z" fill="#91b17d"/><path d="m39 44-17-13m22 23 18-13M38 27 27 14m16 21 14-12" stroke="#6d935e"/><path d="m32 64 15 3" stroke="#d899b2" stroke-width="5"/>`,
  herbpot: `${shadow}<path d="m19 41 6 25c2 9 28 9 30 0l6-25Z" fill="#dfa2b9"/><ellipse cx="40" cy="41" rx="21" ry="6" fill="#b28670"/><path d="M39 40V16m0 18L25 22m15 15 15-16" stroke="#76915f" stroke-width="2.5"/><path d="M37 30C17 32 11 19 17 12c12-1 23 6 20 18Zm4 5c-1-19 14-29 23-21 1 13-7 22-23 21ZM39 20C28 10 35 3 41 7c6-4 13 5-2 13Z" fill="#96b17e"/><path d="M29 49 32 61" stroke="#ffdfeb" stroke-width="3"/><path d="M42 53c-7-7-10 1-4 5l4 3 4-3c6-4 3-12-4-5Z" fill="#fff0dc" stroke="none"/>`,
  herbbasket: `${shadow}<path d="M18 42c0-35 44-35 44 0" stroke="#bd8499" stroke-width="5"/><path d="M16 43c-10-8-6-19 4-19-5-12 8-19 16-9 8-15 24-8 21 5 16-6 22 9 12 17Z" fill="#9ab180"/><path d="M26 47 20 30m18 17-2-24m14 23 9-19" stroke="#718f60" stroke-width="3"/><path d="M11 38h59l-8 26c-3 8-40 8-43 0Z" fill="#e1adc0"/><path d="m22 41 6 24m10-24 1 26m12-26-1 25m12-25-6 24M15 48h51M18 57h46" stroke="#bd839b"/><rect x="9" y="35" width="62" height="8" rx="4" fill="#f3ccda"/><path d="m33 52 7 4 7-4v10H33Z" fill="#fff0dc"/>`,
  seasoning: `${shadow}<rect x="12" y="26" width="26" height="41" rx="5" fill="#d6b990"/><path d="M13 40h24v21H13Z" fill="#9daf80" stroke="none"/><rect x="10" y="20" width="30" height="10" rx="3" fill="#e3a7be"/><rect x="43" y="34" width="26" height="33" rx="5" fill="#e7c4a4"/><path d="M44 43h24v18H44Z" fill="#d49d70" stroke="none"/><rect x="41" y="28" width="30" height="10" rx="3" fill="#f0c1d3"/><rect x="16" y="44" width="18" height="14" rx="3" fill="#fff4df"/><path d="M25 54v-8m0 4-5-3m5 1 5-3" stroke="#819d6d"/><rect x="47" y="47" width="18" height="11" rx="3" fill="#fff1df"/><path d="m52 52 3 1 4-2" stroke="#b97f58"/><path d="M52 21c-8-4-7-10-3-11 4-1 7 5 3 11Zm7 0c0-8 5-11 8-7 1 4-3 7-8 7Z" fill="#9ab181"/>`,
  producecrate: `${shadow}<path d="M15 31c-4-12 8-21 17-15 4-13 20-11 22 1 12-6 23 6 15 16Z" fill="#96b181"/><circle cx="24" cy="31" r="10" fill="#e9a062"/><circle cx="44" cy="27" r="11" fill="#e48791"/><path d="M57 35c-10-10-4-17 5-14 13-1 15 13 5 17Z" fill="#efc67f"/><path d="M10 34h60v33H10Z" fill="#d5a0b4"/><path d="M10 43h60M10 56h60" stroke="#ae718b"/><path d="M16 34v33m48-33v33" stroke="#f5cbd9" stroke-width="5"/><rect x="29" y="45" width="22" height="16" rx="3" fill="#fff0dd"/><path d="m34 53 4 4 8-8" stroke="#be7998" stroke-width="3"/><path d="m42 18-3-6 5 2 6-3-3 7" fill="#8ca572"/>`,
  coffeemachine: `${shadow}<rect x="15" y="11" width="50" height="58" rx="7" fill="#dca0b9"/><path d="M16 35h48v25H16Z" fill="#936e81"/><rect x="12" y="63" width="57" height="8" rx="3" fill="#ecc6d6"/><rect x="23" y="17" width="22" height="9" rx="3" fill="#fff0df"/><circle cx="55" cy="22" r="4" fill="#e6bb75"/><path d="M34 34v7h13v-7" fill="#f0d7d8"/><path d="M41 41v7" stroke="#af8065" stroke-width="3"/><path d="M28 48h23v9c0 9-23 9-23 0Z" fill="#fff0e5"/><path d="M52 50c9-2 9 8 0 8" fill="none" stroke="#f6dce5" stroke-width="3"/><path d="M20 67h41" stroke="#c58aa4"/><path d="m28 21 3 2 7-4" stroke="#c48aa4"/>`,
  cleaningcart: `${shadow}<path d="M19 19v44h44V35M15 18h10" fill="none" stroke="#ac7893" stroke-width="5"/><path d="M15 41h52v6H15Zm0 18h52v6H15Z" fill="#edbfd2"/><circle cx="24" cy="69" r="5" fill="#9e728b"/><circle cx="59" cy="69" r="5" fill="#9e728b"/><path d="m33 20-5 17c0 6 20 6 20 0l-5-17Z" fill="#dda5bf"/><path d="M31 13h18v7H32Z" fill="#f4d5e1"/><path d="m53 38 8-27" stroke="#c8a282" stroke-width="5"/><path d="m54 20 12 3" stroke="#e9b8cd" stroke-width="6"/><rect x="27" y="49" width="25" height="10" rx="3" fill="#f3d59d"/><path d="M33 49v10m7-10v10m6-10v10" stroke="#d6ad74"/>`,
  herbgarden: `${shadow}<path d="M11 45h58v23H11Z" fill="#d5a1b5"/><path d="M11 54h58m-58 8h58M19 45v23m42-23v23" stroke="#b47b92"/><path d="M24 44V22m15 22V13m17 31V24" stroke="#789766" stroke-width="3"/><path d="M23 35c-15 0-20-11-14-16 11 0 17 7 14 16Zm1-7c-1-13 10-20 16-14 0 9-6 15-16 14Zm15-6C27 20 25 9 31 5c10 1 14 8 8 17Zm3 12c0-13 9-20 16-13 0 10-7 15-16 13Zm15 6c-2-15 8-24 16-18 1 10-5 17-16 18Z" fill="#99b382"/><rect x="31" y="49" width="18" height="13" rx="3" fill="#fff0db"/><path d="M40 59v-7m0 4-4-3m4 1 4-3" stroke="#91a879"/>`,
  gift: `${shadow}<rect x="15" y="32" width="50" height="35" rx="4" fill="#efb4c9"/><rect x="11" y="25" width="58" height="12" rx="4" fill="#f7d4df"/><path d="M34 26h12v41H34Z" fill="#d88aa9"/><path d="M39 25C11 28 17 6 28 9c8 1 11 12 11 16Zm3 0C69 27 65 6 54 9c-8 1-11 12-12 16Z" fill="#e9a4be"/><path d="M34 16c3 3 5 6 6 10m9-10c-3 3-6 7-7 10" stroke="#ffe0eb" stroke-width="2.5"/><path d="m23 45 3 7 7 2-7 3-3 7-2-7-7-3 7-2Z" fill="#fff1d4" stroke="none"/>`,
  storage: `${shadow}<path d="M12 27h56v40H12Z" fill="#dba2b9"/><path d="m12 27 11-15h34l11 15Z" fill="#f0c5d4"/><path d="M40 13v14M12 41h56" stroke="#b77a94"/><rect x="30" y="35" width="20" height="9" rx="3" fill="#fff0e0"/><path d="M20 51h13m-13 8h22" stroke="#f9dfe9" stroke-width="3"/><path d="m48 53 5 5 7-8" stroke="#fff0d4" stroke-width="3"/>`,
  shop: `${shadow}<path d="M14 32h52v37H14Z" fill="#e7b3c7"/><rect x="24" y="42" width="16" height="27" rx="2" fill="#fff0e0"/><rect x="47" y="42" width="12" height="13" rx="2" fill="#fbe2df"/><path d="m10 29 8-17h44l8 17Z" fill="#f6d6e1"/><path d="m27 12-4 17m17-17v17m13-17 4 17" stroke="#d28ca8" stroke-width="9"/><path d="M10 29v5c0 8 15 8 15 0 0 8 15 8 15 0 0 8 15 8 15 0 0 8 15 8 15 0v-5" fill="#f3c6d7"/><path d="M35 54v3" stroke="#b87895" stroke-width="3"/><path d="M10 69h60" stroke="#a46f87" stroke-width="3"/>`,
  scissors: `${shadow}<circle cx="23" cy="57" r="11" fill="#e3a0bc"/><circle cx="55" cy="57" r="11" fill="#e3a0bc"/><circle cx="23" cy="57" r="5" fill="#fff0e9"/><circle cx="55" cy="57" r="5" fill="#fff0e9"/><path d="m29 48 26-35c9-9 10-4 5 4L43 47Zm20 0L23 13c-9-9-10-4-5 4l17 30Z" fill="#dfd7df"/><circle cx="39" cy="40" r="5" fill="#f6d3e1"/><circle cx="39" cy="40" r="1.5" fill="#9b6c86" stroke="none"/>`,
  hourglass: `${shadow}<path d="M24 12c0 17 2 20 12 28-10 8-12 13-12 28h32c0-15-2-20-12-28 10-8 12-11 12-28Z" fill="#fff3e6"/><path d="M27 21c1 7 6 12 13 17 7-5 12-10 13-17Z" fill="#edc588" stroke="none"/><path d="M27 63c1-8 6-13 13-18 7 5 12 10 13 18Z" fill="#edc588" stroke="none"/><path d="M40 39v8" stroke="#d5a76a"/><rect x="19" y="8" width="42" height="8" rx="3" fill="#e3a5be"/><rect x="19" y="64" width="42" height="8" rx="3" fill="#e3a5be"/><path d="M30 20c0 7 3 10 5 12" stroke="#fffdf5" stroke-width="3"/>`,
  heart: `${shadow}<path d="M40 66C-2 40 9 13 26 14c7 0 12 5 14 10 2-5 7-10 14-10 17-1 28 26-14 52Z" fill="#e494b0"/><path d="M22 23c-5 1-8 5-8 10" fill="none" stroke="#ffd2e2" stroke-width="4"/><path d="M43 54c11-8 18-16 21-24" stroke="#cb7e9d" stroke-width="3" fill="none"/>`,
  diamond: `${shadow}<path d="m22 16-13 19 31 35 31-35-13-19Z" fill="#e5b0ce"/><path d="m22 16 9 19H9m22 0 9 35 9-35-9-19-9 19h18l9-19 13 19H49" fill="#f5d9e9"/><path d="m9 35 31 35-9-35m40 0L40 70l9-35" fill="#cd8fb7"/><path d="m22 16 9 19 9-19 9 19 9-19M9 35h62" fill="none" stroke="#a86f97"/><path d="m19 24 4-5m31 4 4 7" stroke="#fff0f7" stroke-width="3"/>`,
  renovate: `${shadow}<path d="M14 16h36v19H14Z" fill="#e5a5bd"/><path d="M15 20h34" stroke="#ffdbe8" stroke-width="3"/><path d="M50 20h11v25H33v10" fill="none" stroke="#b98a9f" stroke-width="4"/><rect x="27" y="52" width="12" height="21" rx="5" fill="#cb879f"/><path d="m56 48 3 6 6 2-6 3-3 6-2-6-6-3 6-2Zm10-35 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#edc27b" stroke="none"/>`,
});


// Regional recipes use distinct shapes, serving ware, and ingredients.
const platter = `${shadow}<ellipse cx="40" cy="55" rx="34" ry="13" fill="#e7b9cb"/><ellipse cx="40" cy="51" rx="34" ry="12" fill="#fff2e5"/>`;
const noodleBowl = `${shadow}<path d="M10 37h60l-7 23c-4 13-42 13-46 0Z" fill="#dba0b9"/><ellipse cx="40" cy="37" rx="30" ry="11" fill="#fff0d7"/><path d="M22 48c2 7 6 11 12 13" stroke="#ffe0ec" stroke-width="3"/>`;
Object.assign(art, {
  rice: `${shadow}<path d="M12 40h56l-7 22c-4 12-38 12-42 0Z" fill="#e4abc0"/><ellipse cx="40" cy="40" rx="28" ry="8" fill="#f4d3de"/><path d="M17 39c-2-5 1-10 6-11-1-7 4-13 11-12 5-8 16-6 19 2 8-1 13 8 9 14 6 4 5 9 1 11-14 5-35 5-46-4Z" fill="#fff3df"/><path d="m24 34 4 1m1-9 4 1m7 8 3 1m4-12 3 1m3 12 4 1m-19-17 3 1m-5 19 4 1" stroke="#dbc2a0" stroke-width="2"/><path d="m35 57 6 3 6-3" stroke="#fff0df" stroke-width="3"/>`,
  dumpling: `${platter}<path d="M15 48c3-30 40-39 53-9-8 24-34 29-53 9Z" fill="#eed3a8"/><path d="M15 48c3-30 40-39 53-9-19-6-35 1-53 9Z" fill="#fff0cf"/><path d="m21 37 3 7m3-15 4 12m3-18 4 15m4-16 3 14m6-12 1 12m8-8-1 9" stroke="#c7a57f" stroke-width="2"/><path d="M27 50c9 3 18 2 28-3" stroke="#ffefd1" stroke-width="3"/>`,
  bun: `${shadow}<ellipse cx="40" cy="62" rx="29" ry="9" fill="#d6a37f"/><path d="M12 50c1-14 11-24 23-29l5-7 6 7c13 4 23 15 23 29 0 23-57 23-57 0Z" fill="#fff0d5"/><path d="M35 22c-6 9-9 17-8 28m12-29-4 27m8-27 3 26m1-24c8 7 12 14 13 24" stroke="#dcc09a" stroke-width="2"/><path d="m33 20 6 5 8-5-6-5Z" fill="#edcc9f"/><path d="M21 53c3 8 17 10 26 8" stroke="#fff9e8" stroke-width="3"/><path d="M23 15c-4-5 4-7 0-12m36 15c-4-5 4-7 0-12" stroke="#d7afbf"/>`,
  noodles: `${noodleBowl}<path d="M18 37c0-10 10-14 17-6 7-11 19-7 24 3m-39 4c3-8 8-9 15-1 8-8 16-8 23-1m-33 3c3-4 7-4 11 1 7-5 12-5 18-1" stroke="#d9a56d" stroke-width="3"/><path d="m49 21 21-15m-18 20 21-12" stroke="#ad7c65" stroke-width="3"/><path d="M51 24c-11-5-17 0-9 7m11-8c-7-2-10 0-7 8m10-8c-5 1-4 6-2 10" stroke="#e7bc7d" stroke-width="2.5"/><path d="m21 30 6 2m28 8 4-4" stroke="#90a875" stroke-width="3"/>`,
  hotpot: `${shadow}<path d="M13 39H8c-7 0-7 12 0 12h8m49-12h7c7 0 7 12 0 12h-8" stroke="#b87c95" stroke-width="5"/><path d="M12 33h56v24c0 19-56 19-56 0Z" fill="#d393ad"/><ellipse cx="40" cy="33" rx="28" ry="13" fill="#eab780"/><path d="M40 21c-18 12 18 12 0 25" stroke="#fff1da" stroke-width="4"/><path d="M39 22c-17 3-22 9-18 16 6 6 16 5 21 5-15-10 7-13-3-21Z" fill="#e49a83" stroke="none"/><path d="m22 30 7 5 3-7m16 4 5-6 6 6" fill="#fff0d4"/><circle cx="54" cy="38" r="3" fill="#a5b17e"/><circle cx="26" cy="37" r="3" fill="#9cab7a"/><path d="M27 13c-5-5 4-7 0-12m24 12c-5-5 4-7 0-12" stroke="#d2a4b9"/><path d="M22 53v5" stroke="#f5c9da" stroke-width="3"/>`,
  dimSum: `${shadow}<path d="M8 32h64v27c0 17-64 17-64 0Z" fill="#d6aa7e"/><path d="M9 45c11 12 51 12 62 0m-60 13c12 9 46 9 58 0" fill="none" stroke="#ad7e60"/><ellipse cx="40" cy="32" rx="32" ry="15" fill="#f0d3a3"/><path d="M14 34c0-13 15-20 20-4 3 9-13 13-20 4Zm26-2c1-13 15-20 21-6 4 8-11 15-21 6ZM26 43c-1-13 13-21 22-8 6 8-11 17-22 8Z" fill="#fff0d1"/><path d="m19 28 4 7m1-10 4 8m18-7 4 6m2-9 4 6m-24 8 4 7m2-10 4 6" stroke="#c8a07b"/><path d="m17 48 2 12m40-12-2 12" stroke="#f2cda1" stroke-width="3"/>`,
  nori: `${shadow}<path d="m16 18 39-8 12 51-39 9Z" fill="#879184"/><path d="m11 23 40-8 12 51-40 9Z" fill="#647c6b"/><path d="m15 25 33-7 11 45-33 8Z" fill="#78917a" stroke="#536b59"/><path d="m21 29 2 6m9-8 2 6m9-8 2 6M24 43l2 6m9-8 2 6m9-8 2 6m-21 9 1 5m9-7 1 5m9-7 1 5" stroke="#a1ad8d" opacity=".7"/><path d="m57 14 2 9" stroke="#c0c3ac" stroke-width="2.5"/>`,
  onigiri: `${shadow}<path d="M31 17c5-8 13-8 18 0l23 38c5 10-1 15-11 15H19c-10 0-16-5-11-15Z" fill="#fff0d9"/><path d="M30 44h20v26H30Z" fill="#70836e"/><path d="m35 48 1 5m8-4 1 6m-10 6 1 5m8-6 1 5" stroke="#a2ae8b"/><path d="m27 33 3-1m14-9 3 1m8 18 3 1m-39 9 3-1m41 6 3 1" stroke="#dbc7aa" stroke-width="2.5"/><path d="M30 24 17 47" stroke="#fffaf0" stroke-width="3"/>`,
  sushi: `${platter}<path d="M13 42c1-9 17-12 25-7 7 5 4 15-4 18-13 4-24-2-21-11Zm27-11c1-9 17-12 25-7 7 5 4 15-4 18-13 4-24-2-21-11Z" fill="#fff0d8"/><path d="M12 37c11-12 25-8 30-2l-4 10c-8-6-17-6-28 2Zm26-11c11-12 25-8 30-2l-4 10c-8-6-17-6-28 2Z" fill="#e6958d"/><path d="m18 34 5 10m4-12 6 10m10-18 6 10m4-12 6 9" stroke="#ffd3b6" stroke-width="2.5"/><path d="m57 49 9-6 5 6-7 7Z" fill="#9fb286"/><path d="M9 61h62" stroke="#dca7be" stroke-width="2"/>`,
  maki: `${platter}<path d="M11 31h24v21c0 9-24 9-24 0Zm27-9h25v21c0 9-25 9-25 0Z" fill="#718470"/><ellipse cx="23" cy="31" rx="12" ry="9" fill="#fff1db"/><ellipse cx="50" cy="22" rx="12" ry="9" fill="#fff1db"/><path d="m18 27 9 1 2 7-10 2Zm27-9 9 1 2 7-10 2Z" fill="#e49d8b"/><path d="m26 27 2 7m25-17 2 7" stroke="#98ac7d" stroke-width="3"/><path d="M33 45h27v17c0 9-27 9-27 0Z" fill="#718470"/><ellipse cx="46" cy="45" rx="13" ry="9" fill="#fff0d9"/><path d="m41 41 9 1 2 6-10 3Z" fill="#e6ac79"/><path d="m43 41 2 8" stroke="#91a67a" stroke-width="3"/>`,
  ramen: `${noodleBowl}<ellipse cx="40" cy="37" rx="25" ry="8" fill="#dab17b" stroke="none"/><path d="M18 37c6-5 11-5 17 0m-10 2c6-4 12-4 17 0m-6-6c6-4 12-4 17 0" stroke="#ffdea0" stroke-width="2.5"/><path d="m18 25 4-14 13 4-4 16Z" fill="#72866e"/><ellipse cx="52" cy="29" rx="10" ry="13" fill="#fff2dc" transform="rotate(25 52 29)"/><ellipse cx="52" cy="31" rx="5" ry="6" fill="#e8b766" stroke="none"/><path d="M24 31c-2-8 12-11 15-4 4 9-12 13-15 4Z" fill="#e8aca5"/><path d="M28 30c3-4 7-3 7 0-1 3-4 3-5 1" stroke="#c77e85" fill="none"/><path d="m57 37 6-3m-18 7 4-3" stroke="#8ca276" stroke-width="3"/><path d="m62 20 10-15m-6 20 10-15" stroke="#af8067" stroke-width="2.5"/>`,
  bento: `${shadow}<path d="M8 17h64v48c0 5-4 7-8 7H16c-4 0-8-2-8-7Z" fill="#b57993"/><rect x="12" y="19" width="56" height="46" rx="4" fill="#f2cfbf"/><path d="M40 20v45m0-21h28" stroke="#b67990" stroke-width="4"/><path d="M16 25h19v34H16Z" fill="#fff1dc"/><circle cx="25" cy="42" r="6" fill="#dc8a8a"/><path d="m19 29 3 1m4 23 3 1m-8 3 2 1" stroke="#d9c3a1"/><path d="m46 25 15 2 3 10-19 1Z" fill="#e59a83"/><path d="m50 26 1 10m5-9 2 9" stroke="#ffd4ae"/><circle cx="49" cy="54" r="6" fill="#94ac7d"/><circle cx="60" cy="54" r="6" fill="#e7ba73"/><path d="M8 17h64v-5H8Z" fill="#f0bfd1"/>`,
  pasta: `${shadow}<path d="M15 14h50l-4 54H19Z" fill="#f4ddbd"/><path d="M15 14h50v10H15Zm4 44h42v10H19Z" fill="#e3a6bd"/><rect x="23" y="29" width="34" height="24" rx="5" fill="#fff0d7"/><path d="m27 33 8 4-8 4 1-4Zm16 5 9 4-9 4 1-4Zm-6-8 8 4-8 4 1-4Zm-3 15 8 4-8 4 1-4Z" fill="#e4b775" stroke="#c7985e" stroke-width="1.5"/><path d="M21 19h38" stroke="#fff1e5" stroke-width="2"/>`,
  spaghetti: `${platter}<path d="M15 45c0-16 14-24 26-12 12-14 25-3 24 10M17 48c4-12 11-17 22-6 14-12 21-8 25 3m-42 3c5-9 11-8 18-2 9-8 16-9 22 1m-35 4c5-7 11-6 18-1 8-6 12-6 17-1" stroke="#dbad6e" stroke-width="4"/><path d="M24 35c0-12 21-15 27-5 12-3 15 9 4 11-11-4-20 5-31-6Z" fill="#d88d7d"/><path d="M39 29c-10-1-12-8-7-10 6 0 8 5 7 10Zm2 0c-1-10 8-14 12-8 0 6-5 9-12 8Z" fill="#94a87b"/><path d="m64 32 6-22m-10 20 5-22m-10 20 5-22" stroke="#b399a3" stroke-width="2"/>`,
  pizza: `${shadow}<path d="M16 18c19-9 39-8 53 3L35 69Z" fill="#d8a371"/><path d="M20 22c16-6 31-5 44 1L35 61Z" fill="#f1ce87"/><path d="M17 17c18-7 37-7 53 5l-5 7c-14-11-28-11-45-5Z" fill="#e6b785"/><circle cx="35" cy="32" r="6" fill="#d98a7e"/><circle cx="52" cy="33" r="6" fill="#d98a7e"/><circle cx="38" cy="49" r="5" fill="#d98a7e"/><path d="m26 26 6 2m15 13 4 2m-15-4 3 1" stroke="#fff0bb" stroke-width="2.5"/><path d="m43 26 4-3m-16 18 1-4m14 13 3-4" stroke="#92a477" stroke-width="3"/>`,
  risotto: `${platter}<path d="M13 48c0-21 23-33 36-20 15-4 22 8 19 20-12 13-43 13-55 0Z" fill="#eac799"/><path d="m24 38 4 1m9-7 4 1m10 10 4 1m-27 6 4 1m7-11 4 1m-1 12 4 1m11-5 4 1m-40 0 3 1" stroke="#fff0d4" stroke-width="3"/><path d="M22 30c0-11 17-12 18 0Z" fill="#b68975"/><path d="M29 30v9h5v-9" fill="#f7ddba"/><path d="M46 39c0-10 16-11 17 0Z" fill="#b68975"/><path d="M53 39v7h5v-7" fill="#f7ddba"/><path d="m44 26 4-6m-1 8 7-2" stroke="#92a57a" stroke-width="3"/>`,
  lasagna: `${platter}<path d="m13 32 31-15 25 16v25L37 69 13 55Z" fill="#d49376"/><path d="m13 32 31-15 25 16-32 14Z" fill="#f2d08a"/><path d="m13 39 24 14 32-14m-56 9 24 14 32-14" stroke="#f6d09b" stroke-width="5"/><path d="M37 47v22" stroke="#bb7e6d"/><path d="m20 31 21-10 18 10-21 10Z" fill="#e6b170" stroke="none"/><path d="m28 31 3 1m10-7 4 1m0 8 4 1" stroke="#fff0b6" stroke-width="3"/><path d="M43 23c-10 0-12-8-7-10 6 0 8 5 7 10Zm2 0c-1-9 7-13 11-7 0 5-5 8-11 7Z" fill="#91a67b"/>`,
  italianfeast: `${platter}<path d="M9 43c0-12 12-19 22-9 11-12 23-4 23 8m-43 4c7-10 13-8 20-2 10-9 17-7 22-1m-36 5c6-6 10-5 17 0 6-6 13-5 16-2" stroke="#e0b579" stroke-width="3"/><path d="m40 20 27 7-17 29Z" fill="#efc879"/><path d="m40 20 28 7" stroke="#d89f71" stroke-width="6"/><circle cx="48" cy="30" r="4" fill="#d7897e"/><circle cx="55" cy="40" r="4" fill="#d7897e"/><path d="M19 34c2-10 17-12 22-4 10 0 12 7 2 9-10-4-17 4-24-5Z" fill="#d38c7c"/><path d="M33 27c-10-1-11-7-7-10 5 0 8 4 7 10Zm2 0c0-8 8-11 11-6-1 5-5 7-11 6Z" fill="#90a67a"/><path d="m61 10 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#e9be77" stroke="none"/>`,
  corn: `${shadow}<path d="M28 57c-8-9-4-25 7-39 10-13 22-9 24 1 2 13-9 34-20 40Z" fill="#edc875"/><path d="m39 19 13 6m-18 2 14 7m-19 2 14 7m-17 2 12 6M45 15 28 50m25-31L36 54" stroke="#cfa05e" stroke-width="2"/><path d="M33 68C10 58 8 41 13 27c13 5 17 20 20 41Zm0 0c0-23 17-40 34-42-2 19-14 35-34 42Z" fill="#9eb487"/><path d="M33 68 18 37m15 31 26-33" stroke="#7e9b6b" stroke-width="2"/>`,
  taco: `${shadow}<path d="M13 52c-8-13 1-24 12-21-2-13 14-16 20-6 10-9 22 1 18 11 12 4 9 19-2 24Z" fill="#99ae7f"/><path d="M14 54c-3-30 35-36 48-12l7 20c-19 16-43 12-55-8Z" fill="#efc783"/><path d="M14 54c3-13 11-21 24-22 15-1 22 7 24 10-19-4-37 0-48 12Z" fill="#fff0bb"/><path d="M20 41c3-8 12-8 15-2m9-4c5-7 13-3 13 4" fill="#dc8e83"/><path d="m26 49 3 1m8-6 3 1m12 9 3 1m-22 5 3 1m11 3 3 1" stroke="#c9975e" stroke-width="2.5"/><path d="m31 39 7-2m9 4 7-1" stroke="#f7e1a1" stroke-width="3"/>`,
  quesadilla: `${platter}<path d="M12 30c17-13 41-12 58 3L34 67Z" fill="#d8aa77"/><path d="M12 25c17-13 41-12 58 3L34 61Z" fill="#f1d39f"/><path d="m18 31 13 25m-3-33 14 28m-2-29 12 20m-13-18 21 10m-33-8 26 16m-33-8 23 15" stroke="#d6ae7b" stroke-width="2"/><path d="m17 38 5 10m22 7 12-11" stroke="#e4bd70" stroke-width="3"/><path d="m55 60 9-8 7 6-9 8Z" fill="#95ab7f"/><circle cx="15" cy="56" r="6" fill="#e09586"/>`,
  burrito: `${shadow}<path d="m24 15 35 15-8 35c-4 12-39 0-38-10Z" fill="#efd2a5"/><path d="m17 34 30 12 11-12-7 31c-4 12-39 0-38-10Z" fill="#e3bc8e"/><ellipse cx="42" cy="24" rx="20" ry="11" transform="rotate(23 42 24)" fill="#fff0d1"/><path d="m27 20 7-4 7 3-4 8-9-1Z" fill="#90a77b"/><path d="m43 23 7-4 7 5-3 8-9-1Z" fill="#d99583"/><path d="m36 26 7-1 2 7-8 1Z" fill="#ad8068"/><path d="m20 41 9 3m-11 4 10 4m-7 8 10 4m10-14 6 2" stroke="#ba936f" stroke-width="2"/><path d="m16 55 29 11" stroke="#f9e6c1" stroke-width="3"/>`,
  nachos: `${platter}<path d="m8 43 13-24 21 26Zm25 4 19-25 19 23Zm-9 7 16-21 17 24Z" fill="#edc482"/><path d="m19 43 15-21 21 25Z" fill="#f4d092"/><path d="M17 39c7-6 13 1 17-5 8-5 13 6 21 4 12-2 14 5 9 8-15-3-21 8-31-1-8 3-14 1-16-6Z" fill="#e5ad63" stroke="none"/><circle cx="29" cy="40" r="4" fill="#d98b82"/><circle cx="49" cy="46" r="4" fill="#d98b82"/><path d="m23 35 4-3m18 0 5-3m10 13 5-2" stroke="#93a97a" stroke-width="3"/><path d="m29 50 1 1m9-4 1 1m17 4 1 1m-35-24 1 1" stroke="#bf925f" stroke-width="2"/>`,
  fiestaplate: `${platter}<path d="M10 44c0-20 23-26 34-9l8 18c-18 13-35 7-42-9Z" fill="#efc783"/><path d="M10 44c3-12 15-19 27-14l7 5c-13-3-25 1-34 9Z" fill="#9eb084"/><path d="m17 37 4-6 7 3-1 6m7-7 6 3-3 5" fill="#d78b80"/><path d="m47 25 15-4 9 31-15 7Z" fill="#efcca1"/><path d="m51 24 12-2 2 7-12 3Z" fill="#93aa7e"/><path d="m52 36 14-4m-11 12 13-4" stroke="#b98c6c"/><circle cx="39" cy="57" r="7" fill="#a4b789"/><path d="m35 57 4-3 4 3" stroke="#dbe6b4"/><path d="m22 10 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#edc47c" stroke="none"/>`,
  asianstall: `${shadow}<path d="M16 29h48v39H16Z" fill="#dfabc1"/><path d="m11 29 8-17h42l8 17Z" fill="#eebdce"/><path d="M10 29h60M20 12h40" stroke="#ba7d98" stroke-width="4"/><path d="M26 34v17m28-17v17" stroke="#b47d95" stroke-width="3"/><path d="M21 50h38v13H21Z" fill="#fff0dc"/><path d="M26 50c0-10 28-10 28 0" fill="#ddbd90"/><path d="M28 50c0-10 8-12 11-5 4-8 12-5 13 5" fill="#fff2da"/><path d="M35 35h10v8H35Z" fill="#f7dec6"/><path d="M16 68h48" stroke="#b77f99" stroke-width="4"/><path d="m34 15 4 4 8-1" fill="none" stroke="#fff0da" stroke-width="2.5"/>`,
  worldkitchen: `${shadow}<path d="M12 31h56v37H12Z" fill="#dca7bf"/><path d="M11 31c1-16 57-16 58 0Z" fill="#eac0ce"/><path d="M23 21v-8h34v8" fill="#f7d8e0"/><circle cx="40" cy="18" r="11" fill="#fff0d9"/><path d="M29 18h22m-11-11c-7 7-7 15 0 22 7-7 7-15 0-22Zm-9 5h18m-18 12h18" fill="none" stroke="#c597a5" stroke-width="1.5"/><rect x="21" y="41" width="38" height="19" rx="4" fill="#99728a"/><path d="m26 55 8-9 8 9Zm16 0 6-8 6 8Z" fill="#f1ce8f"/><path d="M20 36h40" stroke="#fff0e6" stroke-width="3"/><path d="M18 68v4m44-4v4" stroke-width="4"/>`,
  music: `<path d="M30 54V18l32-7v36" fill="none" stroke="#bb7898" stroke-width="6"/><path d="m30 19 32-7v10l-32 7Z" fill="#e5acc5"/><ellipse cx="21" cy="58" rx="12" ry="9" fill="#dda0bd" transform="rotate(-20 21 58)"/><ellipse cx="53" cy="51" rx="12" ry="9" fill="#dda0bd" transform="rotate(-20 53 51)"/><path d="m14 56 4-2m29-5 4-2" stroke="#ffe0eb" stroke-width="2.5"/>`,
  cook: `${shadow}<path d="M20 33c-14-3-15-22-1-25 7-12 28-11 34 0 16-4 24 17 8 24v28H20Z" fill="#fff1e6"/><path d="M20 48h41v13H20Z" fill="#e6afc7"/><path d="M30 20v17m11-20v20m11-18v18" stroke="#e2bdcc" stroke-width="2.5"/><path d="M27 62h28v7H27Z" fill="#cb8da9"/><path d="m32 54 8 3 9-3" stroke="#fff1e6" stroke-width="2.5"/>`,
});

art.cupboard = `${shadow}<rect x="13" y="8" width="54" height="61" rx="6" fill="#e2a7bf"/><rect x="20" y="15" width="40" height="27" rx="3" fill="#fff0df"/><path d="M20 28h40m-20-13v27M13 48h54m-54 10h54" stroke="#be819c"/><path d="M30 53h20m-20 10h20" stroke="#fff0e4" stroke-width="3"/><path d="M24 21h12v7H24Zm20 12h12v9H44Z" fill="#e6bbcf"/><path d="M18 69v4m44-4v4" stroke-width="4"/>`;
art.toolbox = art.utensils;

function escapeAttribute(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

export function icon(name, className = '') {
  return `<svg class="${escapeAttribute(className)}" viewBox="0 0 80 80" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${art[name] || art.star}</svg>`;
}

export function kitchenScene(stage = 0) {
  const level = Math.max(0, Math.min(8, Number(stage) || 0));
  // Eight additions remain visible, making every renovation cumulative.
  const upgrades = [
    `<g><rect x="18" y="82" width="121" height="8" rx="3" fill="#c891a5"/><path d="M28 90v13m101-13v13" stroke-width="4"/><rect x="30" y="48" width="26" height="34" rx="6" fill="#e6b77d"/><rect x="28" y="45" width="30" height="7" rx="3" fill="#c28e6d"/><rect x="66" y="58" width="26" height="24" rx="5" fill="#fff1df"/><path d="M70 58v-5h18v5" fill="#e2b5c8"/><path d="m105 82-3-21h26l-3 21Z" fill="#e2a9be"/><path d="M115 63V43m0 10c-12 1-14-8-10-12 8 0 12 5 10 12Zm1-5c0-11 10-15 14-9 0 7-6 11-14 9Z" fill="#a0b68a" stroke="#7f976b"/></g>`,
    `<g><path d="M388 33h119" stroke="#bb859e" stroke-width="5"/><path d="M401 33v33m30-33v34m30-34v33m29-33v29"/><path d="M401 66c-12 0-13 18 0 21 13-3 12-21 0-21Z" fill="#ded5d8"/><path d="m421 63 20 0-1 22h-18Z" fill="#d4aa7f"/><path d="M426 67v13m9-13v13" stroke="#b58c68"/><path d="M461 65c-15 3-15 22 0 25 15-3 15-22 0-25Z" fill="#f5e3e9"/><path d="M461 65c-5 8-5 16 0 25 5-9 5-17 0-25"/><circle cx="490" cy="81" r="18" fill="#a47f93"/><circle cx="490" cy="81" r="13" fill="#7b6077"/><path d="M482 75c3-3 7-4 10-3" stroke="#c6a2b8"/></g>`,
    `<g><rect x="22" y="157" width="107" height="9" rx="4" fill="#fff0e5"/><ellipse cx="74" cy="155" rx="29" ry="5" fill="#ae8299"/><path d="M52 129H42c-7 0-6 11 1 11h9m45-11h10c7 0 7 11 0 11H97" stroke-width="4"/><path d="M52 125h45v24c0 12-45 12-45 0Z" fill="#dd9daf"/><path d="M49 125c0-15 51-15 51 0Z" fill="#f0bfcd"/><path d="M48 126h54M70 115v-5h11v5" stroke-width="3"/><path d="M65 105c-6-7 4-9 0-16m19 16c6-7-4-9 0-16" stroke="#c3a0b2"/></g>`,
    `<g><rect x="170" y="153" width="138" height="12" rx="6" fill="#d5a77f"/><path d="M181 153c-4-24 24-33 37-14 13-12 34-6 34 14Z" fill="#e5b376"/><path d="m193 137 7 10m12-10 7 10m13-8 6 9" stroke="#fff0c3" stroke-width="4"/><circle cx="269" cy="149" r="10" fill="#e69398"/><path d="m268 141-6-4 6 1 3-5 1 6 6 1-6 3Z" fill="#90a87b" stroke="#7e9769"/><path d="m288 154 11-18c3-4 8-1 6 4l-14 17Z" fill="#eeb17a"/><path d="m301 137 2-7m-1 7 7-3" stroke="#92a67a" stroke-width="3"/></g>`,
    `<g><rect x="387" y="111" width="93" height="53" rx="7" fill="#d79bb3"/><rect x="397" y="121" width="35" height="10" rx="3" fill="#fff0e1"/><circle cx="461" cy="126" r="5" fill="#edc582"/><path d="M398 137h71v21h-71Z" fill="#9b718a"/><path d="M420 137v8h24v-8" fill="#f0d3df"/><path d="M422 146h21v8c0 7-21 7-21 0Z" fill="#fff2e8"/><path d="M443 148c8-2 8 6 0 6" fill="none" stroke="#fce3ed"/><rect x="382" y="160" width="104" height="7" rx="3" fill="#f4cbd9"/><path d="m497 146-3 19h22l-3-19Z" fill="#fff0df"/><path d="M505 147v-16" stroke-width="4"/></g>`,
    `<g><path d="m198 128-3-21h27l-3 21Z" fill="#e4a6bd"/><path d="M208 108V87m0 14c-13 0-16-10-11-15 9 1 14 6 11 15Zm1-8c0-11 10-15 15-10 0 7-6 12-15 10Z" fill="#9db88a" stroke="#7f986c"/><path d="m314 128-3-25h30l-3 25Z" fill="#f5dfc1"/><path d="M326 105V80m0 16c-14 0-17-11-12-16 10 1 15 7 12 16Zm1-9c0-13 11-17 16-11 0 8-6 13-16 11Z" fill="#a7bc8d" stroke="#80986d"/><path d="M223 132h76" stroke="#f5d2de" stroke-width="5"/><path d="m230 129-2-13h14l-2 13m6 0-2-13h14l-2 13m6 0-2-13h14l-2 13m6 0-2-13h14l-2 13" fill="#daa3ba"/><path d="M235 117v-8m16 8v-8m16 8v-8m16 8v-8" stroke="#8da577" stroke-width="3"/></g>`,
    `<g><path d="M78 0v23m350-23v10" stroke="#ad7c93"/><path d="M56 43c0-28 44-28 44 0Z" fill="#e6a5bd"/><ellipse cx="78" cy="43" rx="22" ry="5" fill="#fff0c9"/><path d="M66 27c-4 3-6 6-7 11" stroke="#ffdae6" stroke-width="3"/><path d="M375 11q54 24 128 0" stroke="#c193a7"/><circle cx="385" cy="15" r="4" fill="#ffe6a6" stroke="none"/><circle cx="407" cy="21" r="4" fill="#ffe6a6" stroke="none"/><circle cx="432" cy="23" r="4" fill="#ffe6a6" stroke="none"/><circle cx="457" cy="21" r="4" fill="#ffe6a6" stroke="none"/><circle cx="483" cy="16" r="4" fill="#ffe6a6" stroke="none"/><rect x="26" y="217" width="129" height="10" rx="5" fill="#f3c2d2"/><path d="m39 228-5 37m106-37 5 37" stroke="#bd879c" stroke-width="6"/><path d="M85 244h59v-28H85Z" fill="#e9b6c8"/><path d="M82 243h65v8H82Z" fill="#fff1e4"/><path d="m90 251-4 19m52-19 4 19" stroke-width="4"/></g>`,
    `<g><path d="M349 268c-3-20 1-32 15-41h27c14 10 19 22 16 41Z" fill="#fff8ed"/><path d="M364 231c-8-8-10-21-6-29 5-11 22-12 31-3 9 8 7 23-1 30v8h-22Z" fill="#fff8ef"/><path d="M386 213c9-3 20 0 21 5-3 5-13 8-21 4Z" fill="#edbc76"/><circle cx="379" cy="208" r="2" fill="#795766" stroke="none"/><ellipse cx="379" cy="218" rx="4" ry="2.5" fill="#efb3bd" stroke="none"/><path d="M356 202v-9c-9-5-7-15 3-16 5-8 15-7 20-1 12-4 20 7 13 15v11Z" fill="#fff9f1"/><path d="M359 195h31" stroke="#e0bdcc"/><path d="m364 231 26 2-10 11-17-7m11 6-1 17 8-4 2-14" fill="#d58ba8"/><path d="M454 244h-30m8 0v-16c0-9 18-9 18 0v16" stroke="#be8da1" stroke-width="4"/><path d="M416 247h46v8h-46Z" fill="#e4b1c7"/><path d="m425 255-4 16m32-16 4 16" stroke-width="4"/><path d="m502 135 2 6 6 2-6 2-2 6-2-6-6-2 6-2m-166-89 2 5 5 2-5 2-2 5-2-5-5-2 5-2" fill="#edc37c" stroke="none"/><path d="M455 190h55v18h-55Z" fill="#fff1dc"/><path d="M464 197h37m-30 6h23" stroke="#d19ab1" stroke-width="2"/></g>`
  ];
  return `<svg viewBox="0 0 540 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <rect width="540" height="280" rx="18" fill="#fbe5eb"/>
  <path d="M0 105h540v85H0Z" fill="#fff2ec"/>
  <g stroke="#edcbd7" stroke-width="1.2"><path d="M0 105h540M0 134h540M0 163h540M0 190h540M30 105v29m60-29v29m60-29v29m60-29v29m60-29v29m60-29v29m60-29v29m60-29v29m60-29v29M0 134v29m60-29v29m60-29v29m60-29v29m60-29v29m60-29v29m60-29v29m60-29v29m60-29v29"/></g>
  <path d="M0 192h540v88H0Z" fill="#f3d5df"/>
  <g stroke="#e5bacb" opacity=".6"><path d="M0 218h540M0 245h540M30 192v26m60-26v26m60-26v26m60-26v26m60-26v26m60-26v26m60-26v26m60-26v26m60-26v26M0 218v27m60-27v27m60-27v27m60-27v27m60-27v27m60-27v27m60-27v27m60-27v27m60-27v27"/></g>
  <g stroke="#946579" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="175" y="17" width="179" height="117" rx="11" fill="#e8b4c8"/>
  <rect x="182" y="24" width="165" height="103" rx="6" fill="#f9e6df"/>
  <circle cx="308" cy="52" r="16" fill="#f4d69e" stroke="none"/>
  <path d="M183 104c34-22 59-10 82 3 24-24 52-19 81-9v29H183Z" fill="#efd2dc" stroke="none"/>
  <path d="M183 117c32-12 50-5 82 2 27-15 54-10 81-3v11H183Z" fill="#e4bbc9" stroke="none"/>
  <path d="M265 24v103M182 78h165" stroke="#f8efe5" stroke-width="6"/>
  <path d="M183 25c1 21-7 38-16 49V23l17-3Zm164 0c-1 21 7 38 16 49V23l-17-3Z" fill="#f6cad8" stroke="#d99ab3"/>
  <path d="m170 64 9 3m173 0 9-3" stroke="#c88ca6"/>
  <rect x="170" y="128" width="190" height="9" rx="4" fill="#dba7b9"/>
  <path d="M0 177h540v29H0Z" fill="#d899b3"/>
  <path d="M0 185h540M128 185v21m139-21v21m135-21v21" stroke="#b97c96"/>
  <path d="M51 194h26m107 0h26m109 0h26m105 0h26" stroke="#ffe8e1" stroke-width="4"/>
  <rect x="-3" y="166" width="546" height="14" rx="4" fill="#eed1b3"/>
  <path d="M0 170h540" stroke="#fff2df"/>
  <path d="M184 211h121v49H184Z" fill="#e1a9bd"/>
  <path d="M196 218h97v34h-97Z" fill="#f3cbd8"/>
  <path d="M236 225h17" stroke="#fff0df" stroke-width="4"/>
  <path d="M184 260h121" stroke="#c38ca4" stroke-width="4"/>
  ${[4, 5, 2, 3, 0, 6, 1, 7].slice(0, level).map(index => upgrades[index]).join('')}
  </g></svg>`;
}
