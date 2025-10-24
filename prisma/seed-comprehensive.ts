import { PrismaClient, UserType, UserStatus, ProjectStatus, ProjectType, ApplicationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');
  console.log('📋 Creating 5+ rows per table with login credentials...\n');

  // Clear existing data
  await prisma.application.deleteMany();
  await prisma.projectSkill.deleteMany();
  await prisma.project.deleteMany();
  await prisma.userSkill.deleteMany();
  await prisma.location.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.skill.deleteMany();

  // Create Skills (15 skills)
  const skills = await Promise.all([
    prisma.skill.create({ data: { name: 'JavaScript', category: 'Programming' } }),
    prisma.skill.create({ data: { name: 'TypeScript', category: 'Programming' } }),
    prisma.skill.create({ data: { name: 'React', category: 'Frontend' } }),
    prisma.skill.create({ data: { name: 'Node.js', category: 'Backend' } }),
    prisma.skill.create({ data: { name: 'Python', category: 'Programming' } }),
    prisma.skill.create({ data: { name: 'UI/UX Design', category: 'Design' } }),
    prisma.skill.create({ data: { name: 'Project Management', category: 'Management' } }),
    prisma.skill.create({ data: { name: 'Digital Marketing', category: 'Marketing' } }),
    prisma.skill.create({ data: { name: 'Vue.js', category: 'Frontend' } }),
    prisma.skill.create({ data: { name: 'Angular', category: 'Frontend' } }),
    prisma.skill.create({ data: { name: 'PHP', category: 'Backend' } }),
    prisma.skill.create({ data: { name: 'Laravel', category: 'Backend' } }),
    prisma.skill.create({ data: { name: 'Graphic Design', category: 'Design' } }),
    prisma.skill.create({ data: { name: 'Content Writing', category: 'Marketing' } }),
    prisma.skill.create({ data: { name: 'Data Analysis', category: 'Analytics' } }),
  ]);

  // Create Admin Users (2 admins)
  const adminUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@localtalents.ca',
        password: await bcrypt.hash('admin123', 10),
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Admin',
            lastName: 'User',
            displayName: 'LocalTalents Admin',
            bio: 'Platform administrator',
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'superadmin@localtalents.ca',
        password: await bcrypt.hash('super123', 10),
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Super',
            lastName: 'Admin',
            displayName: 'Super Administrator',
            bio: 'System administrator with full access',
          }
        }
      }
    })
  ]);

  // Create Business Users (5 businesses)
  const businessUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'business1@example.com',
        password: await bcrypt.hash('business123', 10),
        userType: UserType.BUSINESS,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'John',
            lastName: 'Smith',
            displayName: 'TechCorp Solutions',
            companyName: 'TechCorp Solutions Inc.',
            bio: 'Leading technology solutions provider in Vancouver',
            website: 'https://techcorp.example.com',
            phone: '+1-604-555-0101',
            location: {
              create: {
                street: '123 Business St',
                city: 'Vancouver',
                province: 'BC',
                country: 'Canada',
                postalCode: 'V6B 1A1',
                latitude: 49.2827,
                longitude: -123.1207,
              }
            }
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'business2@example.com',
        password: await bcrypt.hash('business123', 10),
        userType: UserType.BUSINESS,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Sarah',
            lastName: 'Johnson',
            displayName: 'Digital Innovations',
            companyName: 'Digital Innovations Ltd.',
            bio: 'Innovative digital marketing agency',
            website: 'https://digitalinnovations.example.com',
            phone: '+1-416-555-0202',
            location: {
              create: {
                city: 'Toronto',
                province: 'ON',
                country: 'Canada',
                postalCode: 'M5V 3A8',
                latitude: 43.6532,
                longitude: -79.3832,
              }
            }
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'business3@example.com',
        password: await bcrypt.hash('business123', 10),
        userType: UserType.BUSINESS,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Michael',
            lastName: 'Brown',
            displayName: 'StartupHub',
            companyName: 'StartupHub Inc.',
            bio: 'Helping startups build amazing products',
            website: 'https://startuphub.example.com',
            phone: '+1-403-555-0303',
            location: {
              create: {
                city: 'Calgary',
                province: 'AB',
                country: 'Canada',
                postalCode: 'T2P 1J9',
                latitude: 51.0447,
                longitude: -114.0719,
              }
            }
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'business4@example.com',
        password: await bcrypt.hash('business123', 10),
        userType: UserType.BUSINESS,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Emily',
            lastName: 'Davis',
            displayName: 'CreativeWorks',
            companyName: 'CreativeWorks Studio',
            bio: 'Creative design and branding agency',
            website: 'https://creativeworks.example.com',
            phone: '+1-514-555-0404',
            location: {
              create: {
                city: 'Montreal',
                province: 'QC',
                country: 'Canada',
                postalCode: 'H3A 0G4',
                latitude: 45.5017,
                longitude: -73.5673,
              }
            }
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'business5@example.com',
        password: await bcrypt.hash('business123', 10),
        userType: UserType.BUSINESS,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'David',
            lastName: 'Wilson',
            displayName: 'EcoTech Solutions',
            companyName: 'EcoTech Solutions Ltd.',
            bio: 'Sustainable technology solutions',
            website: 'https://ecotech.example.com',
            phone: '+1-250-555-0505',
            location: {
              create: {
                city: 'Victoria',
                province: 'BC',
                country: 'Canada',
                postalCode: 'V8W 1P6',
                latitude: 48.4284,
                longitude: -123.3656,
              }
            }
          }
        }
      }
    })
  ]);

  // Create Talent Users (8 talents)
  const talentUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'talent1@example.com',
        password: await bcrypt.hash('talent123', 10),
        userType: UserType.TALENT,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Alex',
            lastName: 'Chen',
            displayName: 'Alex Chen',
            title: 'Full Stack Developer',
            bio: 'Experienced full-stack developer with 5+ years in React and Node.js',
            hourlyRate: 85.00,
            availability: 'Available for new projects',
            website: 'https://alexchen.dev',
            phone: '+1-604-555-1001',
            location: {
              create: {
                city: 'Vancouver',
                province: 'BC',
                country: 'Canada',
                postalCode: 'V6K 2G8',
                latitude: 49.2734,
                longitude: -123.1339,
              }
            },
            skills: {
              create: [
                { skillId: skills[0].id, level: 5, experience: 5 }, // JavaScript
                { skillId: skills[1].id, level: 4, experience: 3 }, // TypeScript
                { skillId: skills[2].id, level: 5, experience: 4 }, // React
                { skillId: skills[3].id, level: 4, experience: 4 }, // Node.js
              ]
            }
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'talent2@example.com',
        password: await bcrypt.hash('talent123', 10),
        userType: UserType.TALENT,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Maria',
            lastName: 'Rodriguez',
            displayName: 'Maria Rodriguez',
            title: 'UI/UX Designer',
            bio: 'Creative designer specializing in user experience and interface design',
            hourlyRate: 75.00,
            availability: 'Available part-time',
            website: 'https://mariarodriguez.design',
            phone: '+1-416-555-2002',
            location: {
              create: {
                city: 'Toronto',
                province: 'ON',
                country: 'Canada',
                postalCode: 'M4W 1A8',
                latitude: 43.6762,
                longitude: -79.3947,
              }
            },
            skills: {
              create: [
                { skillId: skills[5].id, level: 5, experience: 6 }, // UI/UX Design
                { skillId: skills[12].id, level: 4, experience: 5 }, // Graphic Design
              ]
            }
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'talent3@example.com',
        password: await bcrypt.hash('talent123', 10),
        userType: UserType.TALENT,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'James',
            lastName: 'Taylor',
            displayName: 'James Taylor',
            title: 'Python Developer',
            bio: 'Backend developer specializing in Python and data analysis',
            hourlyRate: 90.00,
            availability: 'Available full-time',
            website: 'https://jamestaylor.dev',
            phone: '+1-403-555-3003',
            location: {
              create: {
                city: 'Calgary',
                province: 'AB',
                country: 'Canada',
                postalCode: 'T2P 2M5',
                latitude: 51.0486,
                longitude: -114.0708,
              }
            },
            skills: {
              create: [
                { skillId: skills[4].id, level: 5, experience: 7 }, // Python
                { skillId: skills[14].id, level: 4, experience: 5 }, // Data Analysis
              ]
            }
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'talent4@example.com',
        password: await bcrypt.hash('talent123', 10),
        userType: UserType.TALENT,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Sophie',
            lastName: 'Martin',
            displayName: 'Sophie Martin',
            title: 'Digital Marketing Specialist',
            bio: 'Marketing expert with focus on social media and content strategy',
            hourlyRate: 65.00,
            availability: 'Available for projects',
            website: 'https://sophiemartin.ca',
            phone: '+1-514-555-4004',
            location: {
              create: {
                city: 'Montreal',
                province: 'QC',
                country: 'Canada',
                postalCode: 'H3B 2Y5',
                latitude: 45.5088,
                longitude: -73.5878,
              }
            },
            skills: {
              create: [
                { skillId: skills[7].id, level: 5, experience: 4 }, // Digital Marketing
                { skillId: skills[13].id, level: 4, experience: 3 }, // Content Writing
              ]
            }
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'talent5@example.com',
        password: await bcrypt.hash('talent123', 10),
        userType: UserType.TALENT,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Ryan',
            lastName: 'Lee',
            displayName: 'Ryan Lee',
            title: 'Vue.js Developer',
            bio: 'Frontend developer specializing in Vue.js and modern web technologies',
            hourlyRate: 80.00,
            availability: 'Available for new projects',
            website: 'https://ryanlee.dev',
            phone: '+1-250-555-5005',
            location: {
              create: {
                city: 'Victoria',
                province: 'BC',
                country: 'Canada',
                postalCode: 'V8V 3M4',
                latitude: 48.4222,
                longitude: -123.3657,
              }
            },
            skills: {
              create: [
                { skillId: skills[8].id, level: 5, experience: 4 }, // Vue.js
                { skillId: skills[0].id, level: 4, experience: 5 }, // JavaScript
              ]
            }
          }
        }
      }
    })
  ]);

  console.log('✅ Created users and profiles');

  // Create Projects (8 projects)
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        businessId: businessUsers[0].id,
        title: 'E-commerce Website Development',
        description: 'Build a modern e-commerce platform with React and Node.js',
        type: ProjectType.FIXED_PRICE,
        status: ProjectStatus.PUBLISHED,
        budgetMin: 5000,
        budgetMax: 8000,
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-12-31'),
        duration: '2 months',
        isRemote: true,
        experienceLevel: 'Mid',
        publishedAt: new Date(),
        skills: {
          create: [
            { skillId: skills[0].id }, // JavaScript
            { skillId: skills[2].id }, // React
            { skillId: skills[3].id }, // Node.js
          ]
        }
      }
    }),
    prisma.project.create({
      data: {
        businessId: businessUsers[1].id,
        title: 'Mobile App UI/UX Design',
        description: 'Design user interface and experience for a fitness tracking mobile app',
        type: ProjectType.HOURLY,
        status: ProjectStatus.PUBLISHED,
        hourlyRate: 80,
        startDate: new Date('2024-10-15'),
        duration: '6 weeks',
        isRemote: false,
        city: 'Toronto',
        province: 'ON',
        experienceLevel: 'Senior',
        publishedAt: new Date(),
        skills: {
          create: [
            { skillId: skills[5].id }, // UI/UX Design
          ]
        }
      }
    }),
    prisma.project.create({
      data: {
        businessId: businessUsers[2].id,
        title: 'Python Data Analysis Tool',
        description: 'Develop a data analysis tool using Python and machine learning',
        type: ProjectType.FIXED_PRICE,
        status: ProjectStatus.PUBLISHED,
        budgetMin: 3000,
        budgetMax: 5000,
        startDate: new Date('2024-11-15'),
        duration: '6 weeks',
        isRemote: true,
        experienceLevel: 'Senior',
        publishedAt: new Date(),
        skills: {
          create: [
            { skillId: skills[4].id }, // Python
            { skillId: skills[14].id }, // Data Analysis
          ]
        }
      }
    }),
    prisma.project.create({
      data: {
        businessId: businessUsers[3].id,
        title: 'Brand Identity Design',
        description: 'Create complete brand identity including logo, colors, and guidelines',
        type: ProjectType.FIXED_PRICE,
        status: ProjectStatus.PUBLISHED,
        budgetMin: 2000,
        budgetMax: 4000,
        startDate: new Date('2024-10-20'),
        duration: '4 weeks',
        isRemote: true,
        experienceLevel: 'Mid',
        publishedAt: new Date(),
        skills: {
          create: [
            { skillId: skills[12].id }, // Graphic Design
            { skillId: skills[5].id }, // UI/UX Design
          ]
        }
      }
    }),
    prisma.project.create({
      data: {
        businessId: businessUsers[4].id,
        title: 'Vue.js Dashboard Development',
        description: 'Build an admin dashboard using Vue.js and modern UI components',
        type: ProjectType.HOURLY,
        status: ProjectStatus.PUBLISHED,
        hourlyRate: 75,
        startDate: new Date('2024-11-01'),
        duration: '8 weeks',
        isRemote: true,
        experienceLevel: 'Mid',
        publishedAt: new Date(),
        skills: {
          create: [
            { skillId: skills[8].id }, // Vue.js
            { skillId: skills[0].id }, // JavaScript
          ]
        }
      }
    })
  ]);

  console.log('✅ Created projects');

  // Create Applications (10 applications)
  const applications = await Promise.all([
    prisma.application.create({
      data: {
        projectId: projects[0].id,
        talentId: talentUsers[0].id,
        coverLetter: 'I am excited to work on this e-commerce project. With my 5 years of experience in React and Node.js, I can deliver a high-quality solution.',
        proposedRate: 75.00,
        estimatedHours: 80,
        status: ApplicationStatus.PENDING,
      }
    }),
    prisma.application.create({
      data: {
        projectId: projects[1].id,
        talentId: talentUsers[1].id,
        coverLetter: 'This UI/UX design project aligns perfectly with my expertise. I have designed several mobile apps and understand the importance of user-centered design.',
        proposedRate: 75.00,
        estimatedHours: 60,
        status: ApplicationStatus.ACCEPTED,
      }
    }),
    prisma.application.create({
      data: {
        projectId: projects[2].id,
        talentId: talentUsers[2].id,
        coverLetter: 'As a Python developer with extensive data analysis experience, I am confident I can build the tool you need.',
        proposedRate: 90.00,
        estimatedHours: 50,
        status: ApplicationStatus.PENDING,
      }
    }),
    prisma.application.create({
      data: {
        projectId: projects[3].id,
        talentId: talentUsers[1].id,
        coverLetter: 'I would love to help create your brand identity. My design portfolio showcases similar successful projects.',
        proposedRate: 70.00,
        estimatedHours: 40,
        status: ApplicationStatus.PENDING,
      }
    }),
    prisma.application.create({
      data: {
        projectId: projects[4].id,
        talentId: talentUsers[4].id,
        coverLetter: 'Vue.js is my specialty! I have built several dashboards and can deliver exactly what you need.',
        proposedRate: 80.00,
        estimatedHours: 100,
        status: ApplicationStatus.ACCEPTED,
      }
    })
  ]);

  console.log('✅ Created applications');

  console.log('🎉 Database seeding completed successfully!');
  console.log(`
📊 Seeded data summary:
- ${skills.length} skills
- ${adminUsers.length} admin users
- ${businessUsers.length} business users
- ${talentUsers.length} talent users
- ${projects.length} projects
- ${applications.length} applications

🔐 LOGIN CREDENTIALS:

ADMIN USERS:
- admin@localtalents.ca / admin123
- superadmin@localtalents.ca / super123

BUSINESS USERS:
- business1@example.com / business123 (TechCorp Solutions)
- business2@example.com / business123 (Digital Innovations)
- business3@example.com / business123 (StartupHub)
- business4@example.com / business123 (CreativeWorks)
- business5@example.com / business123 (EcoTech Solutions)

TALENT USERS:
- talent1@example.com / talent123 (Alex Chen - Full Stack Developer)
- talent2@example.com / talent123 (Maria Rodriguez - UI/UX Designer)
- talent3@example.com / talent123 (James Taylor - Python Developer)
- talent4@example.com / talent123 (Sophie Martin - Digital Marketing)
- talent5@example.com / talent123 (Ryan Lee - Vue.js Developer)
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
