import type { Category } from "../../../generated/prisma/client";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g, "");

const categoryKey = (name: string): string | undefined => {
  const value = normalize(name);
  if (/^(?:tshirts?|tshirt|tee|polo)$/.test(value)) return "tshirt";
  if (/^(?:smartwatch|smartwatches)$/.test(value)) return "smartwatch";
  if (/^(?:camera|cameras)$/.test(value)) return "camera";
  if (/^(?:tv|television)$/.test(value)) return "tv";
  if (/^(?:books?)$/.test(value)) return "books";
  if (/^(?:others?|otherproducts|miscellaneous)$/.test(value)) return "other";
  if (/^(?:bras?|bralettes?)$/.test(value)) return "bra";
  if (/^(?:sarees?|saris?)$/.test(value)) return "saree";
  if (/^(?:hoodies?)$/.test(value)) return "hoodie";
  if (/^(?:attar|attaroil)$/.test(value)) return "attar";
  if (/^(?:cosmetic|cosmetics|beauty)$/.test(value)) return "cosmetics";
  if (/^(?:electronics?|gadgets?)$/.test(value)) return "electronics";
  if (/^(?:fashion|clothing|apparel)$/.test(value)) return "fashion";
  if (/^(?:homedecor|decor)$/.test(value)) return "homedecor";
  if (/^(?:jacket|jackets)$/.test(value)) return "jacket";
  if (/^(?:mens|men|menswear)$/.test(value)) return "mens";
  if (/^(?:womens|women|womenswear)$/.test(value)) return "womens";
  if (/^(?:punjabi|panjabi)$/.test(value)) return "punjabi";
  if (/^(?:shoes?|footwear)$/.test(value)) return "shoes";
  if (/^(?:bag|bags|luggage|bagsandluggage)$/.test(value)) return "bags";
  if (/^(?:homekitchen|kitchen|homeandkitchen)$/.test(value)) return "kitchen";
  if (/^(?:kids?|children|toys?)$/.test(value)) return "kids";
  if (/^(?:couplefamilysets?|familysets?)$/.test(value)) return "couples";
  if (/ইলেকট্রনিক|গ্যাজেট/.test(value)) return "electronics";
  if (/টি?শার্ট|টিশার্ট/.test(value)) return "tshirt";
  return undefined;
};

export const isBookCategory = (categoryName: string): boolean => categoryKey(categoryName) === "books";
export const isOtherCategory = (categoryName: string): boolean => categoryKey(categoryName) === "other";
export const categoryType = (categoryName: string): string | undefined => categoryKey(categoryName);

export const isBookProductName = (name: string): boolean =>
  /\b(?:books?|notebooks?|textbooks?|workbooks?|storybooks?|novels?|quran|bible|dictionary|encyclopedia|magazine|journal|boi)\b|বই|খাতা|কুরআন|উপন্যাস/i.test(name);

const productCategoryKeys = (text: string): string[] => {
  const searchable = text.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").toLowerCase();
  const value = normalize(searchable);
  const keys: string[] = [];
  const add = (key: string) => { if (!keys.includes(key)) keys.push(key); };

  if (/couple|familyset|coupleset|matchingpair|কাপল|ফ্যামিলি/.test(value)) add("couples");
  if (/tshirt|tee|polo|টিশার্ট/.test(value)) add("tshirt");
  if (/smartwatch/.test(value)) add("smartwatch");
  if (/camera|ক্যামেরা/.test(value)) add("camera");
  if (/television|\btv\b/.test(text.toLowerCase())) add("tv");
  if (/book|বই/.test(value)) add("books");
  if (/\b(?:bralette|brassiere|bra)\b|\bsports\s+bra\b|ব্রা/.test(searchable)) add("bra");
  if (/\b(?:sarees?|saris?)\b|শাড়ি|সাড়ি/.test(searchable)) add("saree");
  if (/\bhoodies?\b|হুডি/.test(searchable)) add("hoodie");
  if (/attar|আতর/.test(value)) add("attar");
  if (/cosmetic|makeup|skincare|beauty|প্রসাধনী/.test(value)) add("cosmetics");
  if (/shoe|sneaker|footwear|জুতা/.test(value)) add("shoes");
  if (/bag|backpack|rucksack|schoolbag|luggage|wallet|ব্যাগ/.test(value)) add("bags");
  if (/jacket|জ্যাকেট/.test(value)) add("jacket");
  if (/punjabi|panjabi|পাঞ্জাবি/.test(value)) add("punjabi");
  if (/homedecor|decor|lamp|furniture|cushion|sofa|lumbar|সাজসজ্জা/.test(value)) add("homedecor");
  if (/kitchen|cooker|mixer|chopper|storage|rack|organizer|juicer|tablecloth|রান্নাঘর/.test(value)) add("kitchen");
  if (/kids?|children|baby|toy|শিশু|বেবি|খেলনা/.test(value)) add("kids");
  if (/electronic|gadget|bluetooth|usb|charger|charging|powerbank|headphone|earphone|earbud|speaker|cable|adapter|mouse|keyboard|computer|laptop|mobile|phone|projector|led|ইলেকট্রনিক|গ্যাজেট|চার্জার|হেডফোন|ইয়ারফোন|মোবাইল/.test(value)) add("electronics");
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
  const genderParentKey = /\b(?:women|woman|ladies|girls?)\b|মহিলা|নারী/.test(text)
    ? "womens"
    : /\b(?:men|man|male|boys?)\b|পুরুষ/.test(text)
      ? "mens"
      : undefined;

  for (const key of candidates) {
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
