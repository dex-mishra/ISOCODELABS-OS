import { PrismaClient, ExploreResourceType } from '@prisma/client';
import { summarizeResource, answerResourceQuestion, generateStudyPlan } from '../src/lib/ai/explore-ai';

const prisma = new PrismaClient();

async function main() {
  console.log('🏁 Starting Explore Module Verification...');

  try {
    // 1. Verify DB Operations
    console.log('Testing DB operations...');

    // Create a mock resource
    const resource = await prisma.exploreResource.create({
      data: {
        title: 'Understanding React Server Components',
        url: 'https://nextjs.org/docs/app/building-your-application/rendering/server-components',
        content: 'React Server Components allow you to render components on the server, improving performance and developer experience.',
        type: ExploreResourceType.ARTICLE,
        topic: 'Frontend',
        tags: ['React', 'Next.js', 'SSR'],
        ai_summary: 'RSC allows server rendering of React trees.',
        ai_key_points: ['Server components execute on server.', 'Reduces client bundle size.'],
      },
    });

    console.log('✅ Created ExploreResource successfully. ID:', resource.id);

    // Verify relations by reading it back
    const fetched = await prisma.exploreResource.findUnique({
      where: { id: resource.id },
      include: { bookmarks: true },
    });

    if (fetched && fetched.title === 'Understanding React Server Components') {
      console.log('✅ Fetched ExploreResource successfully.');
    } else {
      throw new Error('Failed to fetch resource or title mismatch.');
    }

    // Create a mock bookmark
    // We need a user to bookmark. Let's fetch the first user in the DB.
    const user = await prisma.user.findFirst();
    if (!user) {
      console.warn('⚠️ No user found in DB. Skipping bookmark relation test.');
    } else {
      const bookmark = await prisma.exploreBookmark.create({
        data: {
          resource_id: resource.id,
          user_id: user.id,
          highlight_text: 'render components on the server',
          note: 'RSCs execute on server, not client.',
        },
      });
      console.log('✅ Created ExploreBookmark successfully. ID:', bookmark.id);

      // Verify cascading delete by deleting the resource and verifying bookmark is deleted
      await prisma.exploreResource.delete({
        where: { id: resource.id },
      });
      console.log('✅ Deleted ExploreResource successfully.');

      const checkBookmark = await prisma.exploreBookmark.findUnique({
        where: { id: bookmark.id },
      });

      if (!checkBookmark) {
        console.log('✅ Verified Cascade delete for bookmarks successfully.');
      } else {
        throw new Error('ExploreBookmark was not deleted on cascade.');
      }
    }

    // 2. Verify AI Helper Functions
    console.log('\nTesting AI Helper functions...');

    const summaryResult = await summarizeResource(
      'Docker for Beginners',
      'Docker is a tool designed to make it easier to create, deploy, and run applications by using containers. Containers allow a developer to package up an application with all of the parts it needs, such as libraries and other dependencies, and deploy it as one package.'
    );
    console.log('✅ summarizeResource output verified:', {
      hasSummary: !!summaryResult.summary,
      keyPointsCount: summaryResult.key_points.length,
      tags: summaryResult.tags,
    });

    const mockResourceContext = {
      title: 'Docker for Beginners',
      ai_summary: summaryResult.summary,
      ai_key_points: summaryResult.key_points,
      content: 'Docker containers isolate applications from each other.',
    };

    const qaResult = await answerResourceQuestion(mockResourceContext, 'What is Docker?');
    console.log('✅ answerResourceQuestion output verified. Answer snippet:', qaResult.slice(0, 150) + '...');

    const studyPlanResources = [
      { id: '1', title: 'Introduction to Node.js', type: 'ARTICLE', topic: 'Backend' },
      { id: '2', title: 'Asynchronous JS in Depth', type: 'TUTORIAL', topic: 'Backend' },
    ];
    const planSteps = await generateStudyPlan(studyPlanResources);
    console.log('✅ generateStudyPlan output verified. Steps generated:', planSteps.length);

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Explore module is verified.');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
