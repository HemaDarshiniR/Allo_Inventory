// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Warehouses
  const wh1 = await prisma.warehouse.create({
    data: { name: "Delhi Central", location: "New Delhi, IN" },
  });
  const wh2 = await prisma.warehouse.create({
    data: { name: "Mumbai Hub", location: "Mumbai, IN" },
  });
  const wh3 = await prisma.warehouse.create({
    data: { name: "Bangalore South", location: "Bengaluru, IN" },
  });

  // Products
  const products = [
    {
      name: "Sony WH-1000XM5 Headphones",
      description: "Industry-leading noise cancellation with 30hr battery life.",
      price: 29990,
    },
    {
      name: "Apple iPad Air 11\"",
      description: "M2 chip, 11-inch Liquid Retina display, all-day battery.",
      price: 59900,
    },
    {
      name: "Samsung Galaxy S24",
      description: "AI-powered flagship with 200MP camera and Snapdragon 8 Gen 3.",
      price: 74999,
    },
    {
      name: "Logitech MX Master 3S",
      description: "Advanced wireless mouse with 8K DPI and quiet clicks.",
      price: 9995,
    },
    {
      name: "Kindle Paperwhite",
      description: "Waterproof e-reader with adjustable warm light and 16GB storage.",
      price: 14999,
    },
    {
      name: "JBL Charge 5",
      description: "Portable waterproof speaker with 20 hours playtime.",
      price: 14999,
    },
  ];

  for (const p of products) {
    const product = await prisma.product.create({ data: p });

    // Stock per warehouse (some scarce to demo 409)
    await prisma.stock.create({
      data: {
        productId: product.id,
        warehouseId: wh1.id,
        totalUnits: Math.floor(Math.random() * 10) + 1,
        reservedUnits: 0,
      },
    });
    await prisma.stock.create({
      data: {
        productId: product.id,
        warehouseId: wh2.id,
        totalUnits: Math.floor(Math.random() * 5) + 1,
        reservedUnits: 0,
      },
    });
    await prisma.stock.create({
      data: {
        productId: product.id,
        warehouseId: wh3.id,
        totalUnits: Math.floor(Math.random() * 3),
        reservedUnits: 0,
      },
    });
  }

  console.log("✅ Seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
