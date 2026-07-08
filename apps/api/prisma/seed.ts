import { hash as argonHash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DOCUMENT_TYPES: Array<{ code: string; name: string }> = [
  { code: 'project_card', name: 'Карточка проекта' },
  { code: 'contract', name: 'Договор' },
  { code: 'additional_agreement', name: 'Дополнительное соглашение' },
  { code: 'letter_in', name: 'Входящее письмо' },
  { code: 'letter_out', name: 'Исходящее письмо' },
  { code: 'tender', name: 'Тендерная документация' },
  { code: 'design_documentation', name: 'Проектная документация' },
  { code: 'working_documentation', name: 'Рабочая документация' },
  { code: 'working_documentation_remark', name: 'Замечание к РД' },
  { code: 'estimate', name: 'Смета' },
  { code: 'ks2', name: 'КС-2' },
  { code: 'ks3', name: 'КС-3' },
  { code: 'material_payment_allocation_letter', name: 'Распредписьмо на оплату материалов' },
  { code: 'upd', name: 'УПД' },
  { code: 'ttn', name: 'ТТН' },
  { code: 'delivery_photo', name: 'Фото поставки' },
  { code: 'court_claim', name: 'Судебный иск' },
  { code: 'court_decision', name: 'Судебное решение' },
  { code: 'warranty_request', name: 'Гарантийное обращение' },
  { code: 'defect_list', name: 'Ведомость дефектов' },
  { code: 'additional_work_calculation', name: 'Расчёт дополнительных работ' },
  { code: 'meeting_protocol', name: 'Протокол совещания' },
  { code: 'schedule', name: 'График' },
  { code: 'risk', name: 'Риск' },
  { code: 'photo', name: 'Фото' },
  { code: 'video', name: 'Видео' },
  { code: 'template', name: 'Шаблон' },
  { code: 'department_skill', name: 'Компетенции отдела' },
  { code: 'employee_info', name: 'Информация о сотруднике' },
];

const DEPARTMENTS: Array<{ slug: string; name: string }> = [
  { slug: 'legal', name: 'Юридический отдел' },
  { slug: 'commercial', name: 'Коммерческий отдел' },
  { slug: 'finance', name: 'Финансовый отдел' },
  { slug: 'accounting', name: 'Бухгалтерия' },
  { slug: 'production', name: 'Производство' },
  { slug: 'procurement', name: 'Снабжение' },
  { slug: 'pto', name: 'ПТО' },
  { slug: 'design-review', name: 'Служба проверки РД' },
  { slug: 'hr', name: 'HR' },
  { slug: 'it', name: 'IT' },
  { slug: 'warranty', name: 'Гарантийная служба' },
  { slug: 'safety', name: 'Охрана труда и ТБ' },
];

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-strong';
  const fullName = process.env.SEED_ADMIN_FULL_NAME ?? 'Portal Administrator';

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await argonHash(password),
      fullName,
      role: 'super_admin',
      status: 'active',
    },
  });
  console.log(`Seeded super admin: ${admin.email}`);

  for (const type of DOCUMENT_TYPES) {
    await prisma.documentType.upsert({
      where: { code: type.code },
      update: { name: type.name },
      create: type,
    });
  }
  console.log(`Seeded ${DOCUMENT_TYPES.length} document types`);

  for (const dep of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { slug: dep.slug },
      update: { name: dep.name },
      create: dep,
    });
  }
  console.log(`Seeded ${DEPARTMENTS.length} departments`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
