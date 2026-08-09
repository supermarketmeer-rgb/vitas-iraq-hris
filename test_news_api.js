import fetch from 'node-fetch';

async function testNewsAPI() {
  try {
    console.log('Testing News API...\n');
    
    // Test GET all news
    console.log('1. GET all news:');
    const response = await fetch('http://localhost:5000/api/news');
    const data = await response.json();
    console.log(`Found ${data.length} news items`);
    if (data.length > 0) {
      console.log('Sample news:', JSON.stringify(data[0], null, 2));
    }
    
    // Test GET published news only
    console.log('\n2. GET published news only:');
    const publishedResponse = await fetch('http://localhost:5000/api/news?status=published');
    const publishedData = await publishedResponse.json();
    console.log(`Found ${publishedData.length} published news items`);
    
    // Test GET specific news item
    if (data.length > 0) {
      console.log('\n3. GET specific news item:');
      const specificResponse = await fetch(`http://localhost:5000/api/news/${data[0].id}`);
      const specificData = await specificResponse.json();
      console.log('News item:', JSON.stringify(specificData, null, 2));
    }
    
    // Test POST new news
    console.log('\n4. POST new news:');
    const newNews = {
      title_ar: 'خبر تجريبي',
      title_en: 'Test News',
      content_ar: 'هذا خبر تجريبي للاختبار',
      content_en: 'This is a test news for testing',
      category: 'general',
      target_audience: 'all',
      priority: 'normal',
      published_by: 'Test Admin',
      status: 'draft'
    };
    
    const postResponse = await fetch('http://localhost:5000/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNews)
    });
    const postData = await postResponse.json();
    console.log('Created news:', JSON.stringify(postData, null, 2));
    
    // Test PUT update news
    if (postData.id) {
      console.log('\n5. PUT update news:');
      const updateResponse = await fetch(`http://localhost:5000/api/news/${postData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...postData,
          title_ar: 'خبر تجريبي محدث',
          title_en: 'Test News Updated'
        })
      });
      const updateData = await updateResponse.json();
      console.log('Updated news:', JSON.stringify(updateData, null, 2));
      
      // Test PUT update status
      console.log('\n6. PUT update status to published:');
      const statusResponse = await fetch(`http://localhost:5000/api/news/${postData.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' })
      });
      const statusData = await statusResponse.json();
      console.log('Status updated:', JSON.stringify(statusData, null, 2));
      
      // Test DELETE news
      console.log('\n7. DELETE news:');
      const deleteResponse = await fetch(`http://localhost:5000/api/news/${postData.id}`, {
        method: 'DELETE'
      });
      const deleteData = await deleteResponse.json();
      console.log('Deleted:', deleteData);
    }
    
    console.log('\n✅ All API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testNewsAPI();