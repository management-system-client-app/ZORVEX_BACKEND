import type { Category } from "../../../generated/prisma/client";

const foldStyledText = (value: string): string => value.replace(/[\u{1D400}-\u{1D7FF}]/gu, (character) => {
  const point = character.codePointAt(0) ?? 0;
  for (const start of [0x1d400, 0x1d434, 0x1d468, 0x1d4d0, 0x1d504, 0x1d538, 0x1d56c, 0x1d5a0, 0x1d5d4, 0x1d608, 0x1d63c, 0x1d670]) {
    const upper = point - start;
    if (upper >= 0 && upper < 26) return String.fromCharCode(65 + upper);
    const lower = point - (start + 26);
    if (lower >= 0 && lower < 26) return String.fromCharCode(97 + lower);
  }
  const digit = point - 0x1d7ce;
  if (digit >= 0 && digit < 10) return String.fromCharCode(48 + digit);
  return character;
});

const normalize = (value: string) => foldStyledText(value).toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g, "");

const categoryKey = (name: string): string | undefined => {
  const value = normalize(name);
  if (/^(?:tshirts?|tshirt|tee|polo)$/.test(value)) return "tshirt";
  if (/^(?:kidstshirts?|ladiestshirts?|womenstshirts?)$/.test(value)) return "tshirt";
  if (/^(?:shirts?)$/.test(value)) return "shirts";
  if (/^(?:pants?|trousers?)$/.test(value)) return "pants";
  if (/^(?:rings?)$/.test(value)) return "ring";
  if (/^(?:jewellery|jewelry)$/.test(value)) return "jewellery";
  if (/^(?:watches?|watch)$/.test(value)) return "watch";
  if (/^(?:shaverandtrimmer|shavertrimmer)$/.test(value)) return "shavertrimmer";
  if (/^(?:penandkeyring|penkeyring|keyring)$/.test(value)) return "penkeyring";
  if (/^(?:smartwatch|smartwatches)$/.test(value)) return "smartwatch";
  if (/^(?:camera|cameras)$/.test(value)) return "camera";
  if (/^(?:routers?|onu)$/.test(value)) return "router";
  if (/^(?:tv|television)$/.test(value)) return "tv";
  if (/^(?:books?)$/.test(value)) return "books";
  if (/^(?:hijabs?|khimars?)$/.test(value)) return "hijab";
  if (/^(?:healthandbeauty|healthbeauty)$/.test(value)) return "healthbeauty";
  if (/^(?:homeappliances?)$/.test(value)) return "homeappliance";
  if (/^(?:foods?)$/.test(value)) return "foods";
  if (/^(?:gadgetsandelectronics)$/.test(value)) return "electronics";
  if (/^(?:mobilephones?|smartphones?)$/.test(value)) return "mobilephone";
  if (/^(?:mobileaccessories)$/.test(value)) return "mobileaccessories";
  if (/^(?:haircare)$/.test(value)) return "haircare";
  if (/^(?:parfum|perfume|perfumes)$/.test(value)) return "perfume";
  if (/^(?:eyewear|glasses)$/.test(value)) return "eyewear";
  if (/^(?:caraccessories|vehicleaccessories)$/.test(value)) return "caraccessories";
  if (/^(?:tools?)$/.test(value)) return "tools";
  if (/^(?:prayermats?)$/.test(value)) return "prayermat";
  if (/^(?:clocks?)$/.test(value)) return "clock";
  if (/^(?:stationery|stationary)$/.test(value)) return "stationery";
  if (/^(?:sportsandfitness|sportsfitness)$/.test(value)) return "sportsfitness";
  if (/^(?:bicycleaccessories|cyclingaccessories)$/.test(value)) return "bicycleaccessories";
  if (/^(?:penandkeyring|penkeyring|keyring)$/.test(value)) return "penkeyring";
  if (/^(?:watches?|watch)$/.test(value)) return "watch";
  if (/^(?:shaverandtrimmer|shavertrimmer|trimmers?)$/.test(value)) return "shavertrimmer";
  if (/^(?:raincoats?)$/.test(value)) return "raincoat";
  if (/^(?:winter)$/.test(value)) return "winter";
  if (/^(?:idcardanddiary|idcarddiary)$/.test(value)) return "idcard";
  if (/^(?:others?|otherproducts|miscellaneous)$/.test(value)) return "other";
  if (/^(?:2pcs?|2pics?|2pieces?)$/.test(value)) return "2pcs";
  if (/^(?:3pcs?|3pics?|3pieces?)$/.test(value)) return "3pcs";
  if (/^(?:borka|burqa|burka)$/.test(value)) return "borka";
  if (/^(?:babyitem|babyproducts|infant)$/.test(value)) return "baby";
  if (/^(?:childrenclothing|childrensclothing|kidsclothing)$/.test(value)) return "childrenclothing";
  if (/^(?:capitem|caps|hats?)$/.test(value)) return "cap";
  if (/^(?:bedsheets?|bedlinen|bedcovers?)$/.test(value)) return "bedsheet";
  if (/^(?:electronicdevice|electronicdevices)$/.test(value)) return "electronicdevice";
  if (/^(?:formalpa?nts?|dresspants?)$/.test(value)) return "formalpant";
  if (/^(?:gabardinepa?nts?)$/.test(value)) return "gabardinepant";
  if (/^(?:computeritem|computers?)$/.test(value)) return "computer";
  if (/^(?:contenttools?|contentcreationtools?)$/.test(value)) return "contenttools";
  if (/^(?:fanitem|fans)$/.test(value)) return "fan";
  if (/^(?:bottleandmug|bottlemug|bottlesandmugs)$/.test(value)) return "bottlemug";
  if (/^(?:clothes|clothing|apparel)$/.test(value)) return "clothes";
  if (/^(?:bras?|bralettes?)$/.test(value)) return "bra";
  if (/^(?:sarees?|saris?)$/.test(value)) return "saree";
  if (/^(?:hoodies?)$/.test(value)) return "hoodie";
  if (/^(?:attar|attaroil)$/.test(value)) return "attar";
  if (/^(?:cosmetic|cosmetics|beauty)$/.test(value)) return "cosmetics";
  if (/^(?:electronics?|gadgets?)$/.test(value)) return "electronics";
  if (/^(?:fashion|clothing|apparel)$/.test(value)) return "fashion";
  if (/^(?:homedecor|decor)$/.test(value)) return "homedecor";
  if (/^(?:jacket|jackets|jecket)$/.test(value)) return "jacket";
  if (/^(?:mens|men|menswear|mensfashion)$/.test(value)) return "mens";
  if (/^(?:womens|women|womenswear|womensfashion)$/.test(value)) return "womens";
  if (/^(?:punjabi|panjabi)$/.test(value)) return "punjabi";
  if (/^(?:shoes?|footwear)$/.test(value)) return "shoes";
  if (/^(?:bag|bags|luggage|bagsandluggage)$/.test(value)) return "bags";
  if (/^(?:belt|belts)$/.test(value)) return "belt";
  if (/^(?:homekitchen|kitchen|homeandkitchen)$/.test(value)) return "kitchen";
  if (/^(?:homekichen)$/.test(value)) return "kitchen";
  if (/^(?:homelifestyle|homeandlifestyle)$/.test(value)) return "homelifestyle";
  if (/^(?:kidszone|children|childrenswear)$/.test(value)) return "kids";
  if (/^(?:toys?)$/.test(value)) return "toys";
  if (/^(?:salwarkameez)$/.test(value)) return "salwarkameez";
  if (/^(?:couplefamilysets?|familysets?)$/.test(value)) return "couples";
  if (/ইলেকট্রনিক|গ্যাজেট/.test(value)) return "electronics";
  if (/টি?শার্ট|টিশার্ট/.test(value)) return "tshirt";
  return undefined;
};

export const isBookCategory = (categoryName: string): boolean => categoryKey(categoryName) === "books";
export const isOtherCategory = (categoryName: string): boolean => categoryKey(categoryName) === "other";
export const categoryType = (categoryName: string): string | undefined => categoryKey(categoryName);

export const isBookProductName = (name: string): boolean =>
  !/\b(?:book\s*(?:stands?|holders?|organizers?)|quran\s*(?:boxes?|stands?|racks?|organizers?))\b/i.test(name) &&
  /\b(?:books?|notebooks?|textbooks?|workbooks?|storybooks?|novels?|quran|bible|dictionary|encyclopedia|magazine|journal|boi)\b|বই|খাতা|কুরআন|উপন্যাস/i.test(name);

const productCategoryKeys = (text: string): string[] => {
  const searchable = foldStyledText(text.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&")).toLowerCase();
  const value = normalize(searchable);
  const keys: string[] = [];
  const add = (key: string) => { if (!keys.includes(key)) keys.push(key); };

  if (/couple|familyset|coupleset|matchingpair|কাপল|ফ্যামিলি/.test(value)) add("couples");
  // Piece counts describe a bundle, not the product type. Classify by the
  // garment or item name (T-shirt, Saree, Belt, etc.) instead.
  if (/\b(?:borkas?|burqas?|burkas?|abayas?)\b|বোরকা|আবায়া|আবায়া/.test(searchable)) add("borka");
  if (/\b(?:baby|babies|infant|newborn)\b|বেবি|শিশু/.test(searchable)) add("baby");
  if (/\b(?:children'?s?\s+clothing|kids?\s+clothing|child\s+clothes)\b/.test(searchable)) add("childrenclothing");
  if (/\b(?:caps?|hats?)\b|ক্যাপ/.test(searchable)) add("cap");
  if (/\bcustomi[sz]ed\s+caps?\b|\b(?:brazil|argentina)\b.*\bsupporter\s+cap\b/i.test(searchable)) add("cap");
  if (/\b(?:bed\s*sheets?|bedsheets?|bed\s*linen|bedcovers?)\b/.test(searchable)) add("bedsheet");
  if (/\belectronic\s+devices?\b/.test(searchable)) add("electronicdevice");
  if (/\b(?:formal|dress)\s+trousers?\b|\bformal\s+pants?\b/.test(searchable)) add("formalpant");
  if (/\bgabardine\s+trousers?\b|\bgabardine\s+pants?\b/.test(searchable)) add("gabardinepant");
  if (/\b(?:computers?|laptops?)\b/.test(searchable)) add("computer");
  if (/\bcontent\s+(?:creation\s+)?tools?\b/.test(searchable)) add("contenttools");
  if (/\bfans?\b/.test(searchable)) add("fan");
  if (/\b(?:bottles?|mugs?)\b/.test(searchable)) add("bottlemug");
  if (/\bclothes\b|কাপড়|পোশাক/.test(searchable)) add("clothes");
  if (/\bt\s*-?\s*shirts?\b|\btees?\b|\bpolo(?:\s+shirts?)?\b|\bdrop[\s-]*shoulder\b|টি[\s-]*শার্ট|টিশার্ট/i.test(searchable)) add("tshirt");
  if (/smartwatch/.test(value)) add("smartwatch");
  if (/camera|ক্যামেরা/.test(value)) add("camera");
  if (/television|\btv\b/.test(text.toLowerCase())) add("tv");
  if (/\b(?:books?|notebooks?|textbooks?|workbooks?|storybooks?|booklets?)\b|বই|খাতা|কুরআন|উপন্যাস/i.test(searchable) && !/\b(?:book\s*(?:stands?|holders?|organizers?)|quran\s*(?:stands?|racks?|organizers?))\b/i.test(searchable)) add("books");
  if (/\b(?:id\s*cards?|card\s*holders?)\b/.test(searchable)) add("idcard");
  if (/\b(?:bralette|brassiere|bra)\b|\bsports\s+bra\b|ব্রা/.test(searchable)) add("bra");
  if (/\b(?:sarees?|saris?|sharees?|sharis?)\b|শাড়ি|সাড়ি/.test(searchable)) add("saree");
  if (/\b(?:bangles?|bracelets?|necklaces?|earrings?|jewellery|jewelry|pendants?|anklets?)\b|চুড়ি|গহনা/.test(searchable)) add("jewellery");
  if (/\b(?:rings?)\b/.test(searchable) && /\b(?:gold|silver|jewell?ery|gem|stone|finger|plated|diamond|crystal|zirconia|eternity|heartstone|ruby|adjustable|knot)\b/i.test(searchable)) add("ring");
  if (/\bhoodies?\b|হুডি/.test(searchable)) add("hoodie");
  if (/attar|আতর/.test(value)) add("attar");
  if (/cosmetic|makeup|skincare|beauty|eyelash|falseeyelash|mehendi|henna|nailpolish|facewash|moisturi[sz]er|nightcream|প্রসাধনী/.test(value)) add("cosmetics");
  if (/\b(?:hair\s*care|shampoo|conditioner|hair\s*oil|hair\s*serum)\b/.test(searchable)) add("haircare");
  if (/\b(?:hijabs?|khimars?|jilbabs?)\b|হিজাব|খিমার/.test(searchable)) add("hijab");
  if (/\b(?:cupping|nebulizer|massager|medical|healthcare|dietary supplement|vitamins?)\b/.test(searchable)) add("healthbeauty");
  if (/\b(?:appliance|dry iron|gas stove|stove|kettle|toaster|rice cooker)\b/.test(searchable)) add("homeappliance");
  if (/\b(?:phone\s*(?:cooler|case|holder)|mobile\s*(?:accessories|cooler|case|holder)|case\s*mount)\b/.test(searchable)) add("mobileaccessories");
  else if (/\b(?:dual\s*sim|mobile\s*phone|smartphone|feature\s*phone)\b/.test(searchable)) add("mobilephone");
  if (/\b(?:chocolate|candy|snack|food|coffee|tea|spice|honey|cashew|nuts?)\b/.test(searchable)) add("foods");
  if (/\b(?:car\s+emergency|seat\s*belt\s*cutter|car\s+accessories|vehicle\s+accessories)\b/.test(searchable)) add("caraccessories");
  if (/\b(?:salwar|kameez|palazzo)\b/.test(searchable)) add("salwarkameez");
  if (/\b(?:(?:three|3)[\s-]*(?:pieces?|pcs?|pics?))\b/i.test(searchable) && /\b(?:cotton|unstitched|suit|collection|salwar|kameez|printed|embroidered|fabric)\b/i.test(searchable)) add("salwarkameez");
  if (/টু-পিস|টু পিস|কটি সেট/.test(searchable) && /কটি|এমব্রয়ডারি|এমব্রয়ডারি/.test(searchable)) add("salwarkameez");
  if (/\b(?:desk\s*clocks?|alarm\s*clocks?|wall\s*clocks?|clock)\b/i.test(searchable)) add("clock");
  if (/\b(?:cap|caps|supporter\s+cap)\b|ক্যাপ/.test(searchable)) add("cap");
  if (/\b(?:key\s*rings?|ballpoint\s+pens?|uv\s+printed\s+pens?)\b/i.test(searchable)) add("penkeyring");
  if (/\b(?:exercise\s+grippers?|hand\s+grips?|yoga\s*(?:and|&)\s*workout\s*mats?|workout\s*mats?)\b/i.test(searchable)) add("sportsfitness");
  if (/\b(?:bicycle|bike)\s+(?:foot\s*)?pump(?:er)?\b/i.test(searchable)) add("bicycleaccessories");
  if (/\b(?:reflective\s+sticker|car\s+sticker)\b/i.test(searchable)) add("caraccessories");
  if (/\b(?:umbrella|telescopic\s+stool|clothesline|cloth\s+hanger|clothes\s+hanger)\b/i.test(searchable)) add("homelifestyle");
  if (/\b(?:massage\s+(?:gun|instrument|roller)|compress\s+massage|massage\s+comb)\b/i.test(searchable)) add("healthbeauty");
  if (/\b(?:sharpener|punch\s+needle|embroidery\s+needle)\b/i.test(searchable)) add("stationery");
  if (/\bsewing\s+machine\b/i.test(searchable)) add("homeappliance");
  if (/\b(?:digital\s+thermometers?|blood\s+pressure\s+monitors?|pulse\s+oximeters?|glucose\s+meters?|nose\s+cleaners?)\b/i.test(searchable)) add("healthbeauty");
  if (/\b(?:water\s+purifiers?|water\s+filters?|air\s+fryers?|juice\s+dispensers?|water\s+dispensers?|gas\s+regulators?|washing\s+machines?|humidifiers?|air\s+purifiers?)\b/i.test(searchable)) add("homeappliance");
  if (/\b(?:smart\s+plugs?|lamp\s+holders?|light\s+sockets?|sensor\s+lamps?|door\s+bells?|calling\s+bells?)\b/i.test(searchable)) add("electronics");
  if (/\b(?:facial\s+serums?|serums?|lipsticks?|highlighters?|concealers?|powder\s+cakes?|translucent\s+powder|oil\s+control\s+powder|scar\s+and\s+acne\s+removal\s+gels?|soap|kajal|lip\s+masks?|hair\s+removal|whitening\s+creams?)\b/i.test(searchable)) add("cosmetics");
  if (/\b(?:supplements?|chia\s+seeds?|fenugreek\s+seeds?|pink\s+salt|oats|honey|cashew\s+nuts?|milk\s+shake)\b/i.test(searchable)) add("foods");
  if (/\b(?:weight\s+gain|slimming\s+capsules?|height\s+develop)\b/i.test(searchable)) add("healthbeauty");
  if (/\b(?:nose\s+pins?|nosepins?|bindi|chains?|chokers?|hand\s+ornaments?|hathphool|tasbih|misbaha)\b/i.test(searchable)) add("jewellery");
  if (/\b(?:katua|panjabi|punjabi)\b/i.test(searchable)) add("punjabi");
  if (/পায়জামা|পায়জামা|পাজামা|\b(?:pajamas?|pyjamas?)\b/i.test(searchable)) add("pants");
  if (/\b(?:jerseys?|football\s+shirts?)\b/i.test(searchable) && !/\b(?:team\s+jersey|national\s+team|supporter)\b/i.test(searchable)) add("tshirt");
  if (/\b(?:supporter\s+caps?|team\s+caps?)\b/i.test(searchable)) add("cap");
  if (/\b(?:quran\s+box(?:es)?|wall\s+box(?:es)?|money\s+saving\s+box(?:es)?|piggy\s+banks?|door\s+closers?|wall\s+lamps?|solar\s+lamps?|aroma\s+diffusers?|night\s+lights?|desk\s+lamps?)\b/i.test(searchable)) add("homelifestyle");
  if (/\b(?:fire\s+extinguisher|metal\s+detector|multimeter|price\s+tag\s+labeller|label\s+maker)\b/i.test(searchable)) add("tools");
  if (/\b(?:video\s+amplifiers?|mobile\s+phone\s+holders?|phone\s+holders?|tripods?|fill\s+lights?|laser\s+pointer|dc\s+ups?|headsets?|earbuds?|airpods?|rechargeable\s+batteries?|battery\s+sets?|smart\s+finder\s+tags?)\b/i.test(searchable)) add("electronics");
  if (/\b(?:game\s+consoles?|gaming\s+consoles?|game\s+boxes?|retro\s+game|game\s+box)\b/i.test(searchable)) add("electronics");
  if (/\b(?:toy\s+cars?|die.cast\s+metal\s+sets?|robot\s+nursery)\b/i.test(searchable)) add("toys");
  if (/\b(?:talking\s+tom|chess\s+(?:board|set)|memory\s+chess|toy\s+cars?|press\s*&\s*rotate\s+stress\s+relief\s+ball|magical\s+water\s+painting|coloring\s+sets?|color\s+sets?)\b/i.test(searchable)) add("toys");
  if (/\b(?:flash\s+card\s+learning\s+devices?|writing\s+tablets?|drawing\s+pads?|writing\s+boards?|drawing\s+boards?)\b/i.test(searchable)) add("toys");
  if (/\b(?:supporter\s+jerseys?|national\s+team\s+jerseys?|football\s+team\s+jerseys?)\b/i.test(searchable)) add("tshirt");
  if (/\b(?:sports?\s+bras?|push.up\s+bras?)\b/i.test(searchable)) add("bra");
  if (/\b(?:brazil|argentina)\b/i.test(searchable) && /\b(?:supporter\s+caps?|team\s+caps?)\b/i.test(searchable)) add("cap");
  if (/\b(?:oil\s+dispensing\s+massage\s+combs?|scalp\s+applicator\s+combs?|hair\s+straighteners?|hair\s+dryers?|hair\s+clippers?|hair\s+trimmers?|beard\s+trimmers?|hair\s+stylers?|hot\s+air\s+stylers?)\b/i.test(searchable)) add("haircare");
  if (/\b(?:towel\s+sets?|hair\s+towels?)\b/i.test(searchable)) add("bedsheet");
  if (/\b(?:dining\s+table\s+covers?|table\s+covers?|fresh\s+boxes?|food\s+storage\s+boxes?|silicone\s+(?:stretch\s+)?lids?|deep\s+fryer\s+pots?|egg\s+dispensers?|silicone\s+spatulas?|chopping\s+boards?|snacks\s+plates?|chef\s+knives?|skinning\s+knives?|meat\s+cutting\s+knives?)\b/i.test(searchable)) add("kitchen");
  if (/৬\s*চেয়ারের\s*ডাইনিং\s*টেবিল\s*কভার/.test(searchable)) add("kitchen");
  if (/\btampas\b|\bsilicone.*(?:wrap|bowl|food|kitchen|panela)|\bfresh\s+box\b/i.test(searchable)) add("kitchen");
  if (/\b(?:customi[sz]ed\s+cap|supporter\s+cap)\b/i.test(searchable)) add("cap");
  if (/\b(?:rechargeable\s+batter(?:y|ies)|battery\s+set)\b/i.test(searchable)) add("electronics");
  if (/\b(?:sports?\s+bra|push.up\s+bra)\b/i.test(searchable)) add("bra");
  if (/\b(?:special\s+magic\s+box|mystery\s+box|gift\s+box)\b/i.test(searchable)) add("homelifestyle");
  if (/\b(?:motor\s+tide\s+flow\s+car|motorized?\s+toy\s+cars?)\b/i.test(searchable)) add("toys");
  if (/\b(?:manicure|pedicure|nail\s+clippers?|grooming\s+kit)\b/i.test(searchable)) add("cosmetics");
  if (/\b(?:oil\s+film\s+cleaning\s+brush|oil\s+film\s+remover|windshield\s+cleaner)\b/i.test(searchable)) add("tools");
  if (/\b(?:chef\s+knives?|skinning\s+knives?|meat\s+cutting\s+knives?)\b/i.test(searchable)) add("kitchen");
  if (/\b(?:laser\s+device|nail\s+fungus|ear\s+cleaning|earpick|ear\s+pick|health\s+therapy|therapy\s+machine|massage\s+pad|acupressure)\b/i.test(searchable)) add("healthbeauty");
  if (/\b(?:ear\s+muffs?|moving\s+ears?)\b/i.test(searchable)) add("winter");
  if (/\b(?:xpon|onu\b|ftth|mesh\s+wi.?fi|wifi\s+mesh)\b/i.test(searchable)) add("router");
  if (/\b(?:bulb\s+cam|security\s+cameras?|wifi\s+cameras?)\b/i.test(searchable)) add("camera");
  if (/\b(?:potty\s+seats?|baby\s+potty)\b/i.test(searchable)) add("baby");
  if (/\b(?:slippers?|massage\s+slippers?)\b/i.test(searchable)) add("shoes");
  if (/\b(?:drawing\s+art\s+sets?|painting\s+sets?|artist\s+sets?)\b/i.test(searchable)) add("stationery");
  if (/\b(?:rodent\s+repellent|repellent\s+tablets?)\b/i.test(searchable)) add("homelifestyle");
  if (/\b(?:tumbler|flowstate)\b/i.test(searchable)) add("bottlemug");
  if (/\b(?:cumin\s+seeds?|sorbot|sesame\s+seeds?|isabgol|black\s+garlic|mixed\s+seeds?)\b/i.test(searchable)) add("foods");
  if (/\b(?:laser\s+pointer|uv\s+detector|money\s+checker|lpg\s+regulators?)\b/i.test(searchable)) add("electronics");
  if (/\b(?:heating\s+hand\s+warmers?|graphene\s+heating)\b/i.test(searchable)) add("winter");
  if (/\b(?:pregnancy\s+pillows?|belly\s+support\s+pillows?)\b/i.test(searchable)) add("healthbeauty");
  if (/\b(?:hose\s+clamps?|fuel\s+transfer\s+pumps?|air\s+pumps?|gas\s+and\s+air\s+booster\s+pumps?)\b/i.test(searchable)) add("tools");
  if (/\b(?:3\s*piece|three\s*piece|three\s*pcs?|3\s*pcs?)\b/i.test(searchable) && /\b(?:cotton|print|printed|unstitched|collection|hasnat|malhar|anaya|suit)\b/i.test(searchable)) add("salwarkameez");
  if (/\b(?:koti\s+(?:borqa|burqa|abaya)|noor\s+koti)\b/i.test(searchable)) add("borka");
  if (/\b(?:frock|kids?\s+frock)\b/i.test(searchable)) add("childrenclothing");
  if (/\b(?:silicone\s+case\s+sports?\s+towel|sports?\s+towel)\b/i.test(searchable)) add("sportsfitness");
  if (/\b(?:whitening\s+(?:pearl|cream)|pinkish\s+glow|translucent\s+facial\s+powder|gluta\s+collagen)\b/i.test(searchable)) add("cosmetics");
  if (/\b(?:white\s+cotton\s+aligh?ori\s+pajamas?|cotton\s+aligh?ori\s+pajamas?)\b/i.test(searchable)) add("pants");
  if (/\b(?:sokany\s+hand\s+blenders?|hand\s+blenders?)\b/i.test(searchable)) add("kitchen");
  if (/\b(?:collapsible\s+outdoor\s+table\s+lamps?|outdoor\s+table\s+lamps?|namaz\s+chairs?)\b/i.test(searchable)) add("homelifestyle");
  if (/\b(?:pure\s+slimming\s+juice|weight\s+loss\s+juice)\b/i.test(searchable)) add("healthbeauty");
  if (/\b(?:four\s+sim|4.?sim)\s+mobiles?\b/i.test(searchable)) add("mobilephone");
  if (/\b(?:gas\s+and\s+air\s+booster\s+pumps?|high\s+pressure\s+gas\s+and\s+air\s+pumps?)\b/i.test(searchable)) add("tools");
  if (/\b(?:telephoto\s+lenses?|zoom\s+metal\s+lenses?)\b/i.test(searchable)) add("mobileaccessories");
  if (/\b(?:motion\s+sensor\s+bulb\s+holders?|pir\s+motion\s+sensors?)\b/i.test(searchable)) add("electronics");
  if (/\b(?:binoculars?)\b/i.test(searchable)) add("eyewear");
  if (/\b(?:safety\s+button\s+shirts?|snap\s+button\s+cargo\s+shirts?)\b/i.test(searchable)) add("shirts");
  if (/\b(?:quran\s+box|box\s+for\s+wall|saving\s+box)\b/i.test(searchable)) add("homelifestyle");
  if (/\bcustomi[sz]ed\s+cap\b|\b(?:brazil|argentina).*supporter\s+cap\b/i.test(searchable)) add("cap");
  if (/\b(?:skin\s+knife|skinning\s+knife|chef\s+knife)\b/i.test(searchable)) add("kitchen");
  if (/\b(?:four.sim|4.sim)\s+(?:mobile|phone)\b/i.test(searchable)) add("mobilephone");
  if (/\b(?:fresh\s+box|multi.purpose\s+chef\s+knife|silicone\s+wrap)\b/i.test(searchable)) add("kitchen");
  if (/\b(?:4.?sim\s+mobile|mobile\s+four\s+sim|four\s+sim\s+mobile)\b/i.test(searchable)) add("mobilephone");
  if (/\b(?:alarm\s+padlocks?|self.squeeze\s+desktop\s+mops?|cleaning\s+mops?|hand\s+fuel\s+transfer\s+pumps?)\b/i.test(searchable)) add("tools");
  if (/\b(?:electronic\s+writing\s+tablet|digital\s+drawing\s+pad|magnetic\s+writing\s+board)\b/i.test(searchable)) add("toys");
  if (/\b(?:mobile\s+telephoto\s+lenses?|phone\s+zoom\s+lenses?|cabinet\s+closet\s+sensor\s+lights?|emergency\s+lights?)\b/i.test(searchable)) add("electronics");
  if (/\b(?:quran\s+boxes?|wall\s+boxes?|money\s+saving\s+boxes?|piggy\s+banks?|door\s+closers?|wall\s+lamps?|solar\s+lamps?|aroma\s+diffusers?|night\s+lights?|desk\s+lamps?|self.defense\s+sticks?|showpieces?|gift\s+roses?|mobile\s+sand\s+painting\s+frames?)\b/i.test(searchable)) add("homelifestyle");
  if (/\b(?:padlocks?|sealing\s+tapes?|mesh\s+tapes?|soldering\s+(?:irons?|leads?)|glue\s+guns?|cleaning\s+mops?|mop\s+sets?|basin\s+cleaners?|gas\s+and\s+air\s+booster\s+pumps?|pressure\s+gas\s+pumps?)\b/i.test(searchable)) add("tools");
  if (/\b(?:card\s+phones?|feature\s+phones?|four.sim\s+mobiles?|4.sim\s+mobiles?)\b/i.test(searchable)) add("mobilephone");
  if (/\b(?:hair\s+clippers?|beard\s+trimmers?|hair\s+trimmers?)\b/i.test(searchable)) add("shavertrimmer");
  if (/\b(?:waterproof\s+sealing\s+tapes?|oil\s+film\s+cleaning\s+brushes?|windshield\s+cleaners?|toilet\s+foam\s+cleaning\s+sprays?|glass\s+cleaners?|vacuum\s+cleaners?)\b/i.test(searchable)) add("homelifestyle");
  if (/\b(?:knit|cotton\s+collar|snap\s+button)\s+shirts?\b/i.test(searchable)) add("shirts");
  if (/\b(?:aligh?ori|aligh?ari)\s+pajamas?\b/i.test(searchable)) add("pants");
  if (/\b(?:jam\s+tangan|reloj\s+digital|rel[oó]gios?)\b/i.test(searchable)) add("watch");
  if (/\b(?:binary|xpon|onu|ftth|mesh\s+wi.fi|wifi\s+router)\b/i.test(searchable)) add("router");
  if (/\b(?:gift\s+boxes?|mystery\s+boxes?|magic\s+boxes?)\b/i.test(searchable)) add("homelifestyle");
  if (/\b(?:three[\s-]*piece|3[\s-]*piece)\b/i.test(searchable) && /\b(?:towel|comforter|bedsheet|bed\s*sheet)\b/i.test(searchable)) add("bedsheet");
  if (/\b(?:smart\s+audio\s+glasses|audio\s+glasses|sunglasses|eyeglasses|eyewear|glasses)\b/i.test(searchable)) add("eyewear");
  if (/\b(?:three[\s-]*piece|3[\s-]*piece)\b/i.test(searchable) && /\b(?:towel|comforter|bedsheet|bed\s*sheet)\b/i.test(searchable)) add("bedsheet");
  if (/\b(?:prayer\s*mats?|jaynamaz|janamaz)\b/.test(searchable) && !/\b(?:stand|rack|organizer)\b/i.test(searchable)) add("prayermat");
  if (/\b(?:quran|prayer\s*book|jaynamaz|janamaz)\b/i.test(searchable) && /\b(?:stand|rack|organizer)\b/i.test(searchable)) add("homelifestyle");
  if (/\braincoats?\b/.test(searchable)) add("raincoat");
  if (/\b(?:hole\s*punch|pliers?|screwdrivers?|wrenches?|tool\s*sets?)\b/.test(searchable)) add("tools");
  if (/shoe|sneaker|footwear|জুতা/.test(value)) add("shoes");
  if (/perfume|parfum|fragrance/.test(value)) add("perfume");
  if (/\b(?:sunglasses|eyeglasses|eyewear|glasses)\b/.test(searchable) && !/\bsmart\s+(?:audio\s+)?glasses\b/i.test(searchable)) add("eyewear");
  const supportBelt = /\b(?:back|waist|abdominal|toning|support|lumbar|posture)\b/i.test(searchable) && /\bbelt\b/i.test(searchable);
  if (supportBelt) add("healthbeauty");
  else if (/\bbelts?\b|বেল্ট/.test(searchable) && !/\b(?:pouch|bags?|cutter|overcoat|hole punch|backpack|watch|clip|earphones?)\b/i.test(searchable)) add("belt");
  if (/bag|pouch|backpack|rucksack|schoolbag|luggage|wallet|ব্যাগ/.test(value) && !/prayer.?mat|jaynamaz|janamaz/.test(value)) add("bags");
  if (/jacket|জ্যাকেট/.test(value)) add("jacket");
  if (/punjabi|panjabi|পাঞ্জাবি/.test(value)) add("punjabi");
  if (/homedecor|decor|lamp|furniture|cushion|sofa|lumbar|সাজসজ্জা/.test(value)) add("homedecor");
  if (/kitchen|cooker|cookware|pancake|egg.?ring|frying.?pan|mixer|chopper|dumpling|maker|butane|gascartridge|storage|rack|organizer|juicer|tablecloth|tablecover|lunchbox|dishwashing|dishwash|siliconegloves?|cleaninggloves?|peeler|vegetable|connector|elbow|রান্নাঘর/.test(value)) add("kitchen");
  if (/curtain|drape|blind|tieback|homeandlifestyle|সাজসজ্জা/.test(value)) add("homelifestyle");
  if (/worldmap|globe/.test(value)) add("homelifestyle");
  if (/homedecor|decoration|wallboard|showerhead|bathroom/.test(value)) add("homelifestyle");
  if (/\btoys?\b|খেলনা/.test(searchable)) add("toys");
  if (/electronic|electric|gadget|bluetooth|usb|charger|charging|powerbank|headphone|earphone|earbud|speaker|cable|adapter|mouse|keyboard|computer|laptop|mobilephone|cellphone|phone|projector|flashlight|torch|drone|led|ইলেকট্রনিক|গ্যাজেট|চার্জার|হেডফোন|ইয়ারফোন|মোবাইল/.test(value)) add("electronics");
  if (/\b(?:women|woman|ladies|girls?)\b|মহিলা|নারী/.test(searchable)) add("womens");
  if (/\b(?:men|man|gents|boys?)\b|পুরুষ/.test(searchable)) add("mens");
  if (/shirt|hoodie|coat|pant|trouser|jeans|kurti|dress|saree|sari|hijab|borka|abaya|clothing|fashion|sweater|vest|fabric|cotton|dropshoulder|জামা|শার্ট|প্যান্ট|শাড়ি|হিজাব|বোরকা|কাপড়|পোশাক/.test(value)) add("fashion");

  return keys;
};

export const classifyMohasagorCategory = (text: string): string | undefined =>
  productCategoryKeys(text)[0];

export const matchStoreCategory = (categories: Category[], productText: string): Category | undefined => {
  const candidates = productCategoryKeys(productText);
  const activeCategories = [...categories]
    .filter((category) => category.isActive)
    .sort((first, second) => first.sortOrder - second.sortOrder);

  const text = productText.toLowerCase();

  // Prefer a specific category explicitly named in the product text, including
  // common supplier spellings such as "2 pic" for "2-pcs" and Borka/Burqa.
  const directAliases: Record<string, string[]> = {
    "2pcs": ["2pcs", "2pc", "2pics", "2pic", "2pieces", "2piece", "twopcs"],
    "3pcs": ["3pcs", "3pc", "3pics", "3pic", "3pieces", "3piece", "threepcs"],
    borka: ["borka", "borkas", "burqa", "burqas", "burka", "burkas", "বোরকা"],
    baby: ["baby", "babies", "infant", "newborn", "বেবি", "শিশু"],
    childrenclothing: ["childrenclothing", "kidsclothing", "childclothes"],
    cap: ["cap", "caps", "hat", "hats", "ক্যাপ"],
    bedsheet: ["bedsheet", "bedsheets", "bedlinen", "bedcover", "bedcovers"],
    electronicdevice: ["electronicdevice", "electronicdevices"],
    formalpant: ["formalpant", "formalpants", "dresspant", "dresspants"],
    gabardinepant: ["gabardinepant", "gabardinepants"],
    computer: ["computer", "computers", "laptop", "laptops"],
    contenttools: ["contenttools", "contentcreationtools"],
    fan: ["fan", "fans"],
    bottlemug: ["bottle", "bottles", "mug", "mugs"],
    belt: ["belt", "belts", "বেল্ট"],
    bags: ["bag", "bags", "ব্যাগ"],
    bag: ["bag", "bags", "ব্যাগ"],
    tshirt: ["t-shirt", "t shirt", "tshirts", "tshirt", "tee", "tee shirt", "polo", "polo shirt", "টিশার্ট"],
    shirts: ["shirt", "shirts"],
    pants: ["pant", "pants"],
    trouser: ["trouser", "trousers"],
    hoodie: ["hoodie", "hoodies"],
    jewellery: ["jewellery", "jewelry"],
    ring: ["ring", "rings"],
    saree: ["saree", "sarees", "sari", "saris"],
    hoodies: ["hoodie", "hoodies"],
    shoes: ["shoe", "shoes", "footwear"],
    wallet: ["wallet", "wallets"],
    speaker: ["speaker", "speakers"],
    router: ["router", "routers"],
    tools: ["tool", "tools", "pliers", "hole punch", "screwdriver", "wrench"],
    watch: ["watch", "watches", "wristwatch", "wrist watch", "jam tangan", "reloj"],
    shavertrimmer: ["shaver", "trimmer", "clipper", "hair clipper", "beard trimmer"],
    penkeyring: ["pen", "ballpoint pen", "key ring", "keyring"],
    clock: ["clock", "alarm clock", "wall clock", "desk clock"],
    stationery: ["stationery", "sharpener", "drawing pad", "writing tablet"],
    sportsfitness: ["sports fitness", "exercise gripper", "workout mat", "yoga mat"],
    bicycleaccessories: ["bicycle accessories", "bike pump", "bicycle pump"],
  };
  const broadCategoryKeys = new Set(["men", "mens", "women", "womens", "electronics", "fashion", "other"]);
  const genderParentKey = /\b(?:kids?|children|baby|boys?)\b|শিশু|বেবি/.test(text)
    ? "kids"
    : /\b(?:women|woman|ladies|girls?)\b|মহিলা|নারী/.test(text)
      ? "womens"
      : /\b(?:men|man|male|gents?)\b|পুরুষ/.test(text)
        ? "mens"
        : undefined;
  const categoryParents = (category: Category): string[] => {
    const keys: string[] = [];
    let current: Category | undefined = category;
    while (current) {
      const key = categoryKey(current.name);
      if (key) keys.push(key);
      current = current.parentId
        ? activeCategories.find((item) => item.id === current?.parentId)
        : undefined;
    }
    return keys;
  };
  if (/\b(?:earphones?|headphones?|earbuds?|airpods?|headsets?|tws)\b/i.test(productText) && !/\bspeakers?\b/i.test(productText)) {
    const audioCategory = activeCategories.find((category) => categoryType(category.name) === "electronics");
    if (audioCategory) return audioCategory;
  }
  const genderPreference = genderParentKey ?? "mens";
  const mostSpecificGarmentCategory = (key: string): Category | undefined => activeCategories
    .filter((category) => categoryKey(category.name) === key)
    .sort((first, second) => Number(!categoryParents(first).includes(genderPreference)) - Number(!categoryParents(second).includes(genderPreference)))[0];
  const categoryForKey = (key: string): Category | undefined =>
    activeCategories.find((category) => categoryKey(category.name) === key);
  const specificRules: Array<[RegExp, string]> = [
    [/\bcustomi[sz]ed\s+caps?\b|\b(?:brazil|argentina)\b.*\bsupporter\s+cap\b|\bteam\s+caps?\b/i, "cap"],
    [/\b(?:sports?\s+bras?|push.up\s+bras?)\b/i, "bra"],
    [/\b(?:snap\s+button\s+cargo\s+shirts?|cotton\s+collar\s+shirts?)\b/i, "shirts"],
    [/পায়জামা|পায়জামা|পাজামা|\b(?:pajamas?|pyjamas?|aligh?ori)\b/i, "pants"],
    [/\b(?:quran\s+box|box\s+for\s+wall|saving\s+box)\b/i, "homelifestyle"],
    [/\b(?:xpon|onu\b|ftth|mesh\s+wi.?fi|wifi\s+mesh)\b/i, "router"],
    [/\b(?:imou\s+ranger|bulb\s+cam|security\s+cameras?|wifi\s+cameras?)\b/i, "camera"],
    [/\b(?:fresh\s+box|silicone\s+wrap|chef\s+knife|skinning\s+knife)\b/i, "kitchen"],
    [/\b(?:tws|earphones?|headphones?|earbuds?|headsets?)\b/i, "electronics"],
    [/\b(?:anti.theft\s+fashion|waterproof\s+anti.theft)\b/i, "bags"],
    [/\b(?:self.squeeze\s+desktop\s+mops?|cleaning\s+mops?|gas\s+and\s+air\s+booster\s+pumps?|high\s+pressure\s+gas\s+and\s+air\s+pumps?)\b/i, "tools"],
    [/\b(?:hot\s+air\s+stylers?|hair\s+straighteners?|hair\s+dryers?)\b/i, "haircare"],
    [/\b(?:motion\s+sensor\s+bulb\s+holders?|pir\s+motion\s+sensors?|cabinet\s+closet\s+sensor\s+lights?)\b/i, "electronics"],
    [/\b(?:telephoto\s+lenses?|zoom\s+metal\s+lenses?)\b/i, "mobileaccessories"],
    [/\b(?:large\s+capacity\s+waterproof\s+anti.theft)\b/i, "bags"],
    [/\b(?:auto\s+spin\s+mops?|mop\s+buckets?)\b/i, "tools"],
    [/\b(?:leak\s+repair\s+coatings?|waterproof\s+agents?)\b/i, "tools"],
    [/\b(?:wooden\s+mirrors?|mini\s+wooden\s+mirrors?)\b/i, "homelifestyle"],
    [/\b(?:namaz|prayer)\s+chairs?\b/i, "homelifestyle"],
    [/\b(?:comforter|towel)\b/i, "bedsheet"],
    [/\b(?:telephoto\s+lenses?|telephoto\s+lens|zoom\s+metal\s+lenses?|zoom\s+metal\s+lens)\b/i, "mobileaccessories"],
    [/\b(?:cabinet\s+closet\s+sensor\s+(?:spot\s+)?lights?)\b/i, "electronics"],
    [/\b(?:gas\s*&\s*air\s+booster\s+pumps?)\b/i, "tools"],
    [/\b(?:allah|mohammad|muhammad)\b.*\b(?:ceramic|hadia|showpiece)\b/i, "homelifestyle"],
    [/\b(?:sofa\s+covers?|wall\s+mats?)\b|ক্যানভাস\s*ওয়ালমেট/i, "homelifestyle"],
    [/\b(?:ac\s+covers?|air\s+conditioner\s+covers?)\b/i, "homeappliance"],
    [/\b(?:dining\s+sets?|dining\s+table\s+sets?)\b/i, "kitchen"],
    [/\b(?:wooden\s+clothes\s+hang?ers?|wooden\s+hang?ers?)\b|কাঠের\s*হ্যাঙ্গার/i, "homelifestyle"],
    [/\b(?:baby\s+carriers?)\b|বেবী\s*ক্যারিয়ার|বেবী\s*ক্যারিয়ার/i, "baby"],
    [/\b(?:waterproof\s+bed\s*sheets?)\b|ওয়াটারপ্রুফ\s*বেডশীট|ওয়াটারপ্রুফ\s*বেডশীট/i, "bedsheet"],
  ];
  for (const [pattern, key] of specificRules) {
    if (pattern.test(productText) && !(key === "electronics" && /\btws\b/i.test(productText) && /\bspeakers?\b/i.test(productText))) {
      const category = categoryForKey(key);
      if (category) return category;
    }
  }
  const winterRootCategory = activeCategories.find((category) => !category.parentId && categoryType(category.name) === "winter");
  if (winterRootCategory && /\b(?:winter|fleece|ear\s+muffs?|hand\s+warmers?|balaclava)\b/i.test(productText) &&
    /\b(?:hoodies?|suits?|tracksuits?|jackets?|trousers?|pants?|masks?|muffs?|hand\s+warmers?|balaclava)\b/i.test(productText)) {
    return winterRootCategory;
  }
  if (/\bt\s*-?\s*shirts?\b|\btees?\b|\bpolo(?:\s+shirts?)?\b|\bdrop[\s-]*shoulder\b|টিশার্ট/i.test(productText)) {
    const tshirtCategory = mostSpecificGarmentCategory("tshirt");
    if (tshirtCategory) return tshirtCategory;
  }
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const directMatch = activeCategories
    .flatMap((category) => {
      const key = categoryKey(category.name) ?? normalize(category.name);
      if (broadCategoryKeys.has(key)) return [];
      const aliases = directAliases[key] ?? [normalize(category.name)];
      // Never route an item to a piece-count category just because its title
      // says "2 pcs"; use the named item category instead.
      if (key === "2pcs" || key === "3pcs") return [];
      if (key === "belt" && /\b(?:back|waist|abdominal|toning|support|lumbar|posture)\b/i.test(productText)) return [];
      if (key === "belt" && /\b(?:pouch|bags?|cutter|overcoat|hole punch|backpack|watch|clip|earphones?)\b/i.test(productText)) return [];
      const position = aliases
        .filter((alias) => normalize(alias).length >= 3)
        .map((alias) => {
          const phrase = alias
            .split(/[^a-z0-9\u0980-\u09ff]+/i)
            .filter(Boolean)
            .map(escapeRegExp)
            .join("[\\s-]*");
          return new RegExp(`(?<![a-z0-9])${phrase}(?![a-z0-9])`, "i").exec(productText)?.index;
        })
        .filter((index): index is number => index !== undefined)
        .sort((first, second) => first - second)[0];
      if (position === undefined) return [];
      if (key === "ring" && !/\b(?:gold|silver|jewell?ery|gem|stone|finger|plated|adjustable|knot)\b/i.test(productText)) return [];
      if (key === "ring" && /\bring\s+lights?\b/i.test(productText)) return [];
      if (key === "kids") return [];
      const audienceKeys = new Set(["baby", "kids", "childrenclothing"]);
      const priority = key === "borka" ? 0 : audienceKeys.has(key) ? 3 : 1;
      const requestedGender = genderParentKey ?? (key === "tshirt" ? "mens" : undefined);
      const hasGenderSpecificCategory = activeCategories.some((item) =>
        categoryKey(item.name) === key && categoryParents(item).includes(requestedGender ?? ""),
      );
      const genderPriority = requestedGender && (key === "tshirt" || (key === "hoodie" && hasGenderSpecificCategory))
        ? categoryParents(category).includes(requestedGender) ? 0 : 1
        : 0;
      return [{ category, position, priority, genderPriority, length: normalize(category.name).length }];
    })
    .sort((first, second) => first.priority - second.priority || first.genderPriority - second.genderPriority || first.position - second.position || second.length - first.length)[0]?.category;
  if (directMatch) return directMatch;

  for (const key of candidates) {
    if (key === "ring" && /\bring\s+lights?\b/i.test(productText)) continue;
    const matches = activeCategories.filter((item) => categoryKey(item.name) === key);
    const preferredParentKey = key === "bra" || key === "saree"
      ? "womens"
      : key === "tshirt" || key === "hoodie" ? genderParentKey : undefined;
    if (preferredParentKey) {
      const parent = activeCategories.find((item) => !item.parentId && categoryKey(item.name) === preferredParentKey);
      const child = parent && matches.find((item) => item.parentId === parent.id);
      if (child) return child;
    }
    if (matches[0]) return matches[0];
  }

  return undefined;
};
