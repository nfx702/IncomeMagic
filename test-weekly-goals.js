#!/usr/bin/env node

const fetch = require('node-fetch');

async function testWeeklyGoalProgress() {
  try {
    console.log('Testing Weekly Goal Progress Feature...');
    console.log('=====================================');
    
    // Test analytics API
    console.log('\n1. Testing Analytics API...');
    const analyticsResponse = await fetch('http://localhost:3000/api/analytics');
    
    if (!analyticsResponse.ok) {
      console.log(`❌ Analytics API failed: ${analyticsResponse.status}`);
      return;
    }
    
    const analyticsData = await analyticsResponse.json();
    console.log(`✅ Analytics API working`);
    console.log(`   - Symbols found: ${Object.keys(analyticsData.symbolAnalytics || {}).length}`);
    
    // Calculate current week's income
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    
    let totalWeeklyPremium = 0;
    
    if (analyticsData.symbolAnalytics) {
      Object.values(analyticsData.symbolAnalytics).forEach(analytics => {
        if (analytics.weeklyBreakdown) {
          const currentWeek = analytics.weeklyBreakdown.find(week => {
            const weekDate = new Date(week.date);
            return weekDate.getTime() === weekStart.getTime();
          });
          
          if (currentWeek) {
            totalWeeklyPremium += currentWeek.income || 0;
          }
        }
      });
    }
    
    console.log(`   - Current week income: $${totalWeeklyPremium.toFixed(2)}`);
    
    // Test recommendations API
    console.log('\n2. Testing Recommendations API...');
    const recommendationsResponse = await fetch('http://localhost:3000/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: ['AAPL', 'MSFT', 'GOOGL'] })
    });
    
    if (!recommendationsResponse.ok) {
      console.log(`❌ Recommendations API failed: ${recommendationsResponse.status}`);
      return;
    }
    
    const recommendationsData = await recommendationsResponse.json();
    console.log(`✅ Recommendations API working`);
    console.log(`   - Recommendations count: ${recommendationsData.recommendations?.length || 0}`);
    
    const totalRecommendedPremium = (recommendationsData.recommendations || [])
      .reduce((sum, rec) => sum + (rec.premium || 0), 0);
    console.log(`   - Total recommended premium: $${totalRecommendedPremium.toFixed(2)}`);
    
    // Test WeeklyGoalProgress calculations
    console.log('\n3. Weekly Goal Progress Calculations...');
    const weeklyTarget = 325;
    const currentProgress = (totalWeeklyPremium / weeklyTarget) * 100;
    const projectedTotal = totalWeeklyPremium + totalRecommendedPremium;
    const projectedProgress = (projectedTotal / weeklyTarget) * 100;
    const willMeetTarget = projectedTotal >= weeklyTarget;
    
    console.log(`   - Weekly target: $${weeklyTarget}`);
    console.log(`   - Current progress: ${currentProgress.toFixed(1)}%`);
    console.log(`   - Projected total: $${projectedTotal.toFixed(2)}`);
    console.log(`   - Projected progress: ${projectedProgress.toFixed(1)}%`);
    console.log(`   - Will meet target: ${willMeetTarget ? '✅ Yes' : '❌ No'}`);
    
    const remainingNeeded = Math.max(0, weeklyTarget - totalWeeklyPremium);
    console.log(`   - Remaining needed: $${remainingNeeded.toFixed(2)}`);
    
    console.log('\n✅ Weekly Goal Progress Feature Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWeeklyGoalProgress();