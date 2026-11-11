INSERT INTO "HomeBlock" (
    "id",
    "kind",
    "title",
    "subtitle",
    "imageUrl",
    "productIds",
    "linkUrl",
    "categoryId",
    "sortOrder",
    "isActive",
    "startsAt",
    "endsAt",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    'GADGET_FESTIVE'::"HomeBlockKind",
    "title",
    "subtitle",
    "imageUrl",
    ARRAY[]::TEXT[],
    "linkUrl",
    "categoryId",
    "sortOrder",
    "isActive",
    "startsAt",
    "endsAt",
    "createdAt",
    "updatedAt"
FROM "HomeBlock"
WHERE "kind" = 'CAMPAIGN';
