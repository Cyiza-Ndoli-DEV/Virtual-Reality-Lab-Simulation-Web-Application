import { Prisma, PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { replacePermissionsFromRoleCode } from '../src/lib/sync-role-permissions'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Hash passwords
  const adminPassword = await hash('Admin@1234', 12)
  const teacherPassword = await hash('Teacher@1234', 12)
  const studentPassword = await hash('Student@1234', 12)

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vrsps.ug' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@vrsps.ug',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  // Create Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@vrsps.ug' },
    update: {},
    create: {
      name: 'John Teacher',
      email: 'teacher@vrsps.ug',
      password: teacherPassword,
      role: 'TEACHER',
      createdById: admin.id,
    },
  })

  // Create Student
  const student = await prisma.user.upsert({
    where: { email: 'student@vrsps.ug' },
    update: {},
    create: {
      name: 'Jane Student',
      email: 'student@vrsps.ug',
      password: studentPassword,
      role: 'STUDENT',
      createdById: admin.id,
    },
  })

  let chemSubjectId: string | null = null
  try {
    const chem = await prisma.subject.upsert({
      where: { code: 'CHEM-101' },
      update: {},
      create: {
        code: 'CHEM-101',
        name: 'General Chemistry I',
        status: 'ACTIVE',
        description: 'Stoichiometry, atomic structure, and introductory thermodynamics.',
      },
    })
    await prisma.subject.upsert({
      where: { code: 'PHY-101' },
      update: {},
      create: {
        code: 'PHY-101',
        name: 'General Physics I',
        status: 'ACTIVE',
        description: 'Mechanics, waves, and heat for STEM majors.',
      },
    })
    chemSubjectId = chem.id
    console.log('Sample subjects CHEM-101 and PHY-101 ensured.')
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2021') {
      console.warn(
        '\n⚠️  Subject table not found — sample subjects were skipped.\n' +
          '   Run:  npx prisma migrate dev\n' +
          '   Then run  npm run seed  again.\n'
      )
    } else {
      throw e
    }
  }

  // Create Experiments
  const titration = await prisma.experiment.upsert({
    where: { id: 'titration-001' },
    update: {
      learningOutcome:
        'Students will perform a titration, identify the endpoint using an indicator, and relate titre volume to concentration.',
      ...(chemSubjectId ? { subjectId: chemSubjectId } : {}),
    },
    create: {
      id: 'titration-001',
      title: 'Acid-Base Titration',
      description:
        'Learn to determine the concentration of an unknown acid using a standard base solution.',
      learningOutcome:
        'Students will perform a titration, identify the endpoint using an indicator, and relate titre volume to concentration.',
      subjectId: chemSubjectId,
      steps: [
        { step: 1, title: 'Prepare burette', description: 'Fill the burette with NaOH solution' },
        { step: 2, title: 'Prepare flask', description: 'Add HCl solution to the conical flask' },
        { step: 3, title: 'Add indicator', description: 'Add 2-3 drops of phenolphthalein indicator' },
        { step: 4, title: 'Titrate', description: 'Slowly add NaOH until colour changes to pink' },
        { step: 5, title: 'Record', description: 'Record the volume of NaOH used' },
      ],
    },
  })

  const combustion = await prisma.experiment.upsert({
    where: { id: 'combustion-001' },
    update: {
      learningOutcome:
        'Students will describe combustion evidence, predict products for magnesium in air, and follow Bunsen burner safety.',
      ...(chemSubjectId ? { subjectId: chemSubjectId } : {}),
    },
    create: {
      id: 'combustion-001',
      title: 'Magnesium Combustion',
      description:
        'Observe the combustion of magnesium in oxygen and identify the product formed.',
      learningOutcome:
        'Students will describe combustion evidence, predict products for magnesium in air, and follow Bunsen burner safety.',
      subjectId: chemSubjectId,
      steps: [
        { step: 1, title: 'Safety first', description: 'Put on safety goggles before starting' },
        { step: 2, title: 'Set up burner', description: 'Turn on the Bunsen burner' },
        { step: 3, title: 'Hold ribbon', description: 'Hold magnesium ribbon with tongs' },
        { step: 4, title: 'Ignite', description: 'Bring ribbon close to the flame carefully' },
        { step: 5, title: 'Observe', description: 'Observe the bright white flame and white ash (MgO)' },
      ],
    },
  })

  // Create Quizzes
  await prisma.quiz.upsert({
    where: { id: 'quiz-titration-001' },
    update: {},
    create: {
      id: 'quiz-titration-001',
      title: 'Titration Quiz',
      experimentId: titration.id,
      questions: [
        {
          question: 'What indicator is used in acid-base titration?',
          options: ['Litmus', 'Phenolphthalein', 'Methyl orange', 'All of the above'],
          correctAnswer: 'Phenolphthalein',
        },
        {
          question: 'What colour does phenolphthalein turn at the endpoint?',
          options: ['Yellow', 'Blue', 'Pink', 'Red'],
          correctAnswer: 'Pink',
        },
        {
          question: 'What equipment is used to measure the volume of NaOH added?',
          options: ['Pipette', 'Beaker', 'Burette', 'Graduated cylinder'],
          correctAnswer: 'Burette',
        },
      ],
    },
  })

  await prisma.quiz.upsert({
    where: { id: 'quiz-combustion-001' },
    update: {},
    create: {
      id: 'quiz-combustion-001',
      title: 'Combustion Quiz',
      experimentId: combustion.id,
      questions: [
        {
          question: 'What is the product of magnesium combustion?',
          options: ['MgO', 'MgCO3', 'Mg(OH)2', 'MgCl2'],
          correctAnswer: 'MgO',
        },
        {
          question: 'What colour is the flame when magnesium burns?',
          options: ['Red', 'Blue', 'Bright white', 'Yellow'],
          correctAnswer: 'Bright white',
        },
        {
          question: 'What safety equipment must be worn during this experiment?',
          options: ['Gloves', 'Safety goggles', 'Lab coat', 'All of the above'],
          correctAnswer: 'Safety goggles',
        },
      ],
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('Admin: admin@vrsps.ug / Admin@1234')
  console.log('Teacher: teacher@vrsps.ug / Teacher@1234')
  console.log('Student: student@vrsps.ug / Student@1234')

  await prisma.roleDefinition.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: 'Admin',
      description:
        'Full access to the admin portal, user management, and system configuration.',
      isSystem: true,
    },
  })
  await prisma.roleDefinition.upsert({
    where: { code: 'TEACHER' },
    update: {},
    create: {
      code: 'TEACHER',
      name: 'Educator',
      description:
        'Teacher portal access for reviewing student work, reports, and lab activity.',
      isSystem: true,
    },
  })
  await prisma.roleDefinition.upsert({
    where: { code: 'STUDENT' },
    update: {},
    create: {
      code: 'STUDENT',
      name: 'Student',
      description:
        'Student portal for running VR lab sessions, quizzes, and viewing assigned experiments.',
      isSystem: true,
    },
  })

  for (const code of ['ADMIN', 'TEACHER', 'STUDENT'] as const) {
    const rd = await prisma.roleDefinition.findUnique({ where: { code } })
    if (rd) {
      await replacePermissionsFromRoleCode(prisma, rd.id, rd.code)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })