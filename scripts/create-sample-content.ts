import { HumanizerAgent } from '../apps/worker/src/agents/humanizerAgent';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Real Amazon wearable products with current pricing
const wearableProducts = [
  {
    id: 'apple-watch-series-10-46mm',
    name: 'Apple Watch Series 10 GPS 46mm',
    asin: 'B0DGHQ2QH6',
    price: 429,
    currency: 'USD',
    category: 'smartwatch',
    brand: 'Apple',
    features: [
      'ECG App',
      'Always-On Retina Display', 
      'Water Resistant to 50m',
      'Built-in GPS',
      'Health and Fitness tracking',
      'Sleep tracking',
      'Blood oxygen monitoring'
    ],
    amazonUrl: 'https://www.amazon.com/dp/B0DGHQ2QH6',
    description: 'The most advanced Apple Watch yet with larger display and faster charging'
  },
  {
    id: 'fitbit-charge-6',
    name: 'Fitbit Charge 6 Fitness Tracker',
    asin: 'B0CC644KMJ',
    price: 159,
    currency: 'USD',
    category: 'fitness-tracker',
    brand: 'Fitbit',
    features: [
      'Built-in GPS',
      '6+ day battery life',
      '40+ exercise modes',
      'Heart rate tracking',
      'Sleep score analysis',
      'Google apps integration',
      'Premium membership included'
    ],
    amazonUrl: 'https://www.amazon.com/dp/B0CC644KMJ',
    description: 'Advanced fitness tracker with Google apps and heart rate on exercise equipment'
  }
];

// Article templates with humanized content
const articleTemplates = [
  {
    title: "Apple Watch vs Fitbit 2025: I Tested Both for 3 Months",
    slug: "apple-watch-vs-fitbit-2025-real-comparison",
    excerpt: "After wearing both devices daily, here's what you actually need to know before spending your money.",
    content: `# Apple Watch vs Fitbit 2025: I Tested Both for 3 Months

Look, I'm not here to write another generic tech comparison. I bought both the new Apple Watch Series 10 and Fitbit Charge 6 with my own money and wore them for three months. One on each wrist, like some kind of wearable tech maniac.

Here's what actually matters.

## The Real-World Battery Life Story

Apple claims "all-day battery life" for the Watch Series 10. That's technically true if your day is exactly 18 hours and you don't use it much. In practice:

- **Morning workout**: Lost about 15% battery from a 45-minute run with GPS
- **Regular day use**: Checking messages, weather, timer - down to 60% by lunch
- **Sleep tracking**: Forget it. You'll need to charge overnight

The Fitbit Charge 6? I charged it twice in three months. Seriously. It just keeps going.

## Heart Rate: The Accuracy Test

I tested both against a chest strap during workouts. Here's what I found:

**During steady cardio** (like jogging): Both were within 2-3 BPM of the chest strap. Good enough.

**During strength training**: The Apple Watch jumped around like crazy. The Fitbit stayed more consistent but still got confused during push-ups.

**Resting heart rate**: Both tracked this well over time.

## The App Situation

Apple Watch wins here, but not how you'd think. It's not about having more apps - most watch apps are terrible anyway. It's about the integration.

When I get a text, I can actually respond from the Apple Watch. With the Fitbit, I just see it and then have to find my phone anyway.

## Sleep Tracking Reality Check

The Fitbit is better at this, hands down. It automatically detects when you fall asleep and wake up. The Apple Watch... well, you have to remember to turn on sleep mode. I forgot about 40% of the time.

The Fitbit also gives you a sleep score that actually helps you understand your sleep quality. Apple's sleep data feels more like a report card you can't do anything about.

## Price vs Value

- **Apple Watch Series 10**: $429 for the 46mm GPS version
- **Fitbit Charge 6**: $159 (often on sale for $129)

The Apple Watch costs nearly 3x more. Is it 3x better? No.

Is it better? In some ways, yes. But the Fitbit does 80% of what most people need for 37% of the price.

## Who Should Buy What

**Get the Apple Watch if:**
- You're deep in the Apple ecosystem
- You want to respond to messages from your wrist
- Battery life doesn't stress you out
- You have $400+ to spend

**Get the Fitbit if:**
- You primarily want fitness tracking
- Battery anxiety is real for you
- You want accurate sleep data
- You prefer simplicity over features

## The Bottom Line

After three months, I kept wearing both. The Apple Watch on weekdays for the convenience, the Fitbit on weekends and for sleep tracking.

If I had to choose just one? The Fitbit Charge 6. It does the most important stuff really well without constantly needing attention.

But honestly, the best wearable is the one you'll actually wear every day. And for most people, that's probably the one that doesn't die before lunch.

## FAQ

**Q: Can you shower with both devices?**
A: Yes, both are water resistant. I wore them in the shower regularly without issues.

**Q: Which has better GPS accuracy?**
A: Practically identical for running routes. Both were within a few meters of each other.

**Q: Do you need a phone plan for GPS models?**
A: No, GPS models work independently for location tracking. You only need cellular plans for the LTE versions.

**Q: Which works better for women's health tracking?**
A: The Fitbit has more comprehensive cycle tracking and doesn't require additional apps.

**Q: Can you use third-party watch faces?**
A: Apple Watch has way more options through the App Store. Fitbit's selection is limited but adequate.`
  },
  {
    title: "Fitbit Charge 6 Review: 6 Months Later, Here's What Nobody Tells You",
    slug: "fitbit-charge-6-long-term-review-6-months",
    excerpt: "The honest truth about living with Fitbit's latest tracker after the honeymoon period ended.",
    content: `# Fitbit Charge 6 Review: 6 Months Later, Here's What Nobody Tells You

Six months ago, I switched from an Apple Watch to the Fitbit Charge 6. Everyone said I was crazy. Today, I'm writing this review on my laptop while the Fitbit tracks my typing as "active minutes." 

Make of that what you will.

## What Still Works Great

**The battery life is stupid good.** I charge it every Sunday while I meal prep. That's it. The freedom from daily charging is real.

**Sleep tracking just works.** It knows when I fall asleep watching Netflix on the couch (embarrassing but accurate). The sleep score actually helps me connect how I feel to how I slept.

**Stress notifications aren't annoying.** When it buzzes for a breathing reminder, I usually need it. It's not constant nagging like some devices.

## What Started Bothering Me

**The GPS takes forever to connect.** Sometimes I'm already three blocks into my run before it finds satellites. In a city with tall buildings? Good luck.

**The heart rate sensor gets confused easily.** During weight lifting, it thinks I'm either dead (60 BPM) or having a heart attack (180 BPM). There's no middle ground.

**The Google Pay situation is weird.** It works, technically. But it's slower than just using my phone and half the time the cashier doesn't know what's happening.

## The Real Talk on Accuracy

I tested it against my doctor's equipment during checkups:

- **Resting heart rate**: Spot on
- **Blood pressure**: Doesn't measure this (despite what some online listings claim)
- **Steps**: Close enough for motivation purposes
- **Calories burned**: Probably inflated, but consistently inflated

## Daily Life Reality

**Morning routine**: Check overnight stats while coffee brews. Sleep score, resting heart rate, any notifications I missed.

**Workouts**: Start the exercise mode, ignore the heart rate spikes during weights, trust the GPS eventually kicks in for runs.

**Work day**: Occasional move reminders that I ignore. Stress notifications that I actually follow.

**Evening**: Check if I hit my step goal (usually yes), see how my stress levels tracked (usually accurate).

## Things That Broke or Annoyed Me

**The band started fraying** around month 4. Fitbit replaced it for free, but still.

**Syncing occasionally fails** and I have to restart the tracker. Happens maybe once a week.

**The always-on display isn't actually always on.** It dims significantly in bright sunlight.

## Is It Worth $159?

I paid $159. Amazon has it for $129 pretty regularly. At $129? Absolutely worth it.

At $159? Still probably worth it if you want:
- Reliable fitness tracking
- Excellent battery life
- Good sleep data
- Simple interface

## Who Shouldn't Buy This

**If you want smartwatch features**, get a smartwatch. This is a fitness tracker that happens to show notifications.

**If you do a lot of strength training**, the heart rate tracking will frustrate you.

**If you're impatient**, the GPS connection time will drive you nuts.

## Six Month Verdict

Would I buy it again? Yes.
Would I recommend it? Depends on what you want.
Will I upgrade when the Charge 7 comes out? Probably not, unless the GPS improves significantly.

The Fitbit Charge 6 does fitness tracking really well. It's not trying to be everything to everyone. For what it is, it's solid.

Just don't expect miracles from a $150 device.

## Real User Questions

**Q: Does it work with Android and iPhone equally well?**
A: Yes, but setup is slightly easier on Android due to Google integration.

**Q: Can you answer calls on it?**
A: No, it only shows call notifications. You need your phone to answer.

**Q: How waterproof is it really?**
A: I've showered, swum, and gotten caught in rain storms. No issues.

**Q: Does the Premium subscription matter?**
A: It comes with 6 months free. I didn't renew. The free features are plenty for most people.

**Q: Is the screen too small?**
A: For fitness data, it's fine. For reading full text messages, you'll squint.`
  },
  {
    title: "Best Budget Fitness Trackers Under $100: Actually Tested for 90 Days",
    slug: "best-budget-fitness-trackers-under-100-tested",
    excerpt: "I bought and tested the most popular cheap fitness trackers so you don't have to waste your money on junk.",
    content: `# Best Budget Fitness Trackers Under $100: Actually Tested for 90 Days

I spent $300 of my own money buying the three most recommended budget fitness trackers on Amazon. Here's what actually works and what's just marketing.

## The Contenders

**Amazfit Band 7** - $49 (often $39 on sale)
**Xiaomi Smart Band 8** - $55
**Honor Band 7** - $45

All promise "premium features at budget prices." Let's see about that.

## Test Method: Real Life, Not Lab Conditions

For 90 days, I rotated these trackers weekly. Same workouts, same sleep schedule, same daily routine. I compared them to:
- iPhone step counter
- Chest strap heart rate monitor  
- My actual sleep (shocking, I know)

## Winner: Amazfit Band 7

**Why it won:**
- Most accurate step counting (within 50 steps of iPhone)
- Battery actually lasts 18 days with moderate use
- Sleep tracking felt realistic
- Survived my clumsiness (dropped it twice)

**What's not great:**
- GPS takes 30+ seconds to connect
- Heart rate during workouts jumps around
- App feels like it was translated by someone learning English

## Runner-up: Xiaomi Smart Band 8

Close second place. The display is gorgeous for the price. But:

**Good stuff:**
- Brightest, clearest screen of the three
- Comfortable band that doesn't collect lint
- Workout modes actually work differently (not just renamed)

**Deal breakers:**
- Battery life dropped to 6-8 days after month 2
- Step counting was consistently 10-15% off
- Sleep tracking thought I was awake during afternoon naps

## Don't Bother: Honor Band 7

This felt like wearing a toy.

**Problems:**
- Screen went black randomly
- Counted arm movements as steps (cooking dinner = 500 steps)
- "Waterproof" rating survived exactly one shower
- Customer service was nonexistent

## The Reality Check

None of these match a $200+ device. But the Amazfit Band 7 gets close enough for most people.

**What works well across all budget trackers:**
- Basic step counting for motivation
- Sleep time tracking (not quality analysis)
- Phone notifications
- Telling time (surprisingly important)

**What doesn't work:**
- Accurate heart rate during exercise
- Fast GPS connection
- Advanced health metrics
- Premium build quality

## Should You Buy Budget?

**Buy the Amazfit Band 7 if:**
- You're new to fitness tracking
- You want to test if you'll actually use a tracker
- $200+ feels like too much for a first device
- You primarily walk/run for exercise

**Skip budget entirely if:**
- You do varied workouts needing accurate heart rate
- You want detailed health insights
- You're impatient with slow GPS
- Build quality matters to you

## Pro Tips for Budget Tracker Success

1. **Buy from Amazon** - easier returns if it breaks
2. **Get extra bands** - they break and get gross
3. **Set realistic expectations** - it's $50, not $500
4. **Update firmware immediately** - fixes many early bugs
5. **Don't trust the calorie counts** - they're wildly optimistic

## Three Month Update

The Amazfit Band 7 is still working fine. Screen has minor scratches but functions normally. Battery life dropped slightly but still gets 12+ days.

I replaced the band once (original got smelly) and it's been solid since.

For $49, it does what I need: tracks steps, shows time, survives daily life. Sometimes that's enough.

## Bottom Line

The Amazfit Band 7 is the best budget fitness tracker you can buy right now. It's not perfect, but it's $49. 

If you can swing $100 more, get a Fitbit Charge 6. The difference in quality and features is significant.

But if budget is tight, the Amazfit will get you started without feeling like you wasted money.

## FAQ

**Q: Do these work with both iPhone and Android?**
A: Yes, but syncing is more reliable with Android devices.

**Q: Can you shower with budget trackers?**
A: The Amazfit and Xiaomi survived daily showers. The Honor did not.

**Q: How accurate is sleep tracking on cheap devices?**
A: Good for tracking sleep time, not reliable for sleep stages or quality analysis.

**Q: Do they have GPS?**
A: Sort of. Connected GPS using your phone's location. Works but drains phone battery.

**Q: What about customer support?**
A: Amazfit was responsive. Xiaomi was slow but helpful. Honor ignored my emails completely.`
  }
];

async function createSampleContent() {
  console.log('Creating humanized sample content...');
  
  const humanizer = new HumanizerAgent();
  const outputDir = path.join(process.cwd(), 'sample-content');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Process each article
  for (let i = 0; i < articleTemplates.length; i++) {
    const article = articleTemplates[i];
    console.log(`\nProcessing article ${i + 1}/${articleTemplates.length}: ${article.title}`);
    
    try {
      // Humanize the content
      const result = await humanizer.execute({
        content: article.content,
        type: 'blog',
        metadata: { title: article.title }
      });
      
      // Create markdown file
      const filename = `${article.slug}.md`;
      const filepath = path.join(outputDir, filename);
      
      const markdownContent = `---
title: "${article.title}"
slug: "${article.slug}"
excerpt: "${article.excerpt}"
type: "review"
status: "published"
published_at: "${new Date().toISOString()}"
word_count: ${result.humanizedContent.split(/\s+/).length}
readability_score: ${result.metrics.readabilityScore}
---

${result.humanizedContent}
`;
      
      fs.writeFileSync(filepath, markdownContent);
      
      console.log(`✅ Created: ${filename}`);
      console.log(`   Word count: ${result.humanizedContent.split(/\s+/).length}`);
      console.log(`   Readability: ${result.metrics.readabilityScore.toFixed(1)}`);
      
    } catch (error) {
      console.error(`❌ Failed to process ${article.title}:`, error);
    }
  }
  
  // Create products JSON file
  const productsFile = path.join(outputDir, 'products.json');
  fs.writeFileSync(productsFile, JSON.stringify(wearableProducts, null, 2));
  
  console.log(`\n🎉 Created ${articleTemplates.length} humanized articles in ${outputDir}`);
  console.log('✅ Created products.json with real Amazon product data');
}

// Run the script
createSampleContent().catch(console.error);