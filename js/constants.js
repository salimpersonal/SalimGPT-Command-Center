export const APP_VERSION='2.0.0';
export const STAGES=[
 {id:'planning',bn:'পরিকল্পনা',en:'Planning',weight:10,icon:'compass',tasks:['ডকুমেন্টারির উদ্দেশ্য ও দর্শক নির্ধারণ','আউটলাইন ও সময়সূচি তৈরি']},
 {id:'research',bn:'গবেষণা',en:'Research',weight:22,icon:'search',tasks:['গবেষণা প্রশ্ন ও মূল উৎস নির্বাচন','বিশ্বস্ত উৎস সংগ্রহ ও নোট তৈরি','গুরুত্বপূর্ণ তথ্য ও দাবি যাচাই']},
 {id:'scripting',bn:'স্ক্রিপ্টিং',en:'Scripting',weight:17,icon:'file-text',tasks:['স্ক্রিপ্টের প্রথম খসড়া','তথ্য, ভাষা ও গঠন সংশোধন','চূড়ান্ত স্ক্রিপ্ট অনুমোদন']},
 {id:'vocal',bn:'ভোকাল / ন্যারেশন',en:'Narration',weight:12,icon:'mic',tasks:['ন্যারেশন পরিকল্পনা ও রেকর্ড','উচ্চারণ, শব্দ ও অডিও যাচাই']},
 {id:'visual',bn:'ভিজ্যুয়াল',en:'Visual Production',weight:17,icon:'image',tasks:['স্টোরিবোর্ড ও দৃশ্য তালিকা','ভিডিও, ছবি, গ্রাফিক্স সংগ্রহ / তৈরি','চিত্র ও ফুটেজের উৎস / অধিকার যাচাই']},
 {id:'editing',bn:'ভিডিও এডিটিং',en:'Editing',weight:15,icon:'film',tasks:['ভিডিওর প্রাথমিক এডিট','সাউন্ড, কালার, সাবটাইটেল ও ফিনিশিং','ফাইনাল ভিডিও এক্সপোর্ট']},
 {id:'review',bn:'চূড়ান্ত যাচাই',en:'Final Review',weight:7,icon:'shield-check',tasks:['তথ্য, কপিরাইট ও উপস্থাপনার চূড়ান্ত পরীক্ষা','ফাইনাল ভিডিও ও আর্কাইভ প্রস্তুত']}
];
export const PLATFORMS=['YouTube','Facebook','Instagram','TikTok','X / Twitter','Threads','LinkedIn','Pinterest','Telegram','WhatsApp Channels','Reddit','Vimeo','Dailymotion','Bluesky','Snapchat','Medium','Substack','Blogger','WordPress','Rumble','Odysee','Website','Other'];
export const NAV=[
 {id:'dashboard',bn:'ড্যাশবোর্ড',en:'Overview',icon:'grid'},
 {id:'ideas',bn:'আইডিয়া ব্যাংক',en:'Idea Vault',icon:'lightbulb'},
 {id:'projects',bn:'ডকুমেন্টারি',en:'Documentary Studio',icon:'film'},
 {id:'tasks',bn:'কাজের পরিকল্পনা',en:'Task Planner',icon:'list-check'},
 {id:'calendar',bn:'ক্যালেন্ডার',en:'Calendar',icon:'calendar'},
 {id:'publishing',bn:'প্রকাশনা মনিটর',en:'Publishing Tracker',icon:'check-circle'},
 {id:'profiles',bn:'সোশ্যাল ও ওয়েবসাইট',en:'Profile Registry',icon:'globe'},
 {id:'resources',bn:'রিসার্চ লাইব্রেরি',en:'Research Library',icon:'file-text'},
 {id:'contacts',bn:'যোগাযোগ ও ফলোআপ',en:'Contacts & Follow-ups',icon:'users'},
 {id:'reminders',bn:'রিমাইন্ডার',en:'Life Assistant',icon:'bell'},
 {id:'goals',bn:'লক্ষ্য ও মাইলস্টোন',en:'Goals',icon:'target'},
 {id:'reports',bn:'রিপোর্ট',en:'Insights',icon:'chart'},
 {id:'activity',bn:'পরিবর্তনের ইতিহাস',en:'Activity Log',icon:'clock'},
 {id:'settings',bn:'নিরাপত্তা ও সিঙ্ক',en:'Settings & Recovery',icon:'settings'},
 {id:'help',bn:'নির্দেশিকা',en:'User Guide',icon:'notes'}
];
export const IDEA_STATUSES={inbox:'Inbox',review:'Under Review',planned:'Planned',shelved:'Shelved',converted:'Converted'};
export const PROJECT_STATUSES={planned:'Planned',active:'In Production',paused:'Paused',completed:'Production Complete',archived:'Archived'};
export const PUBLICATION_STATUSES={not_published:'Not Published',published:'Published',na:'Not Applicable'};
export const PRIORITIES={low:'Low',normal:'Normal',high:'High',urgent:'Urgent'};
export function detectPlatform(url){
 try{
  const host=new URL(url).hostname.replace(/^www\./,'').toLowerCase();
  const rules=[['youtube.com','YouTube'],['youtu.be','YouTube'],['facebook.com','Facebook'],['fb.com','Facebook'],['instagram.com','Instagram'],['tiktok.com','TikTok'],['twitter.com','X / Twitter'],['x.com','X / Twitter'],['threads.net','Threads'],['linkedin.com','LinkedIn'],['pinterest.com','Pinterest'],['pin.it','Pinterest'],['t.me','Telegram'],['telegram.me','Telegram'],['whatsapp.com','WhatsApp Channels'],['reddit.com','Reddit'],['vimeo.com','Vimeo'],['dailymotion.com','Dailymotion'],['bsky.app','Bluesky'],['snapchat.com','Snapchat'],['medium.com','Medium'],['substack.com','Substack'],['blogspot.com','Blogger'],['wordpress.com','WordPress'],['rumble.com','Rumble'],['odysee.com','Odysee']];
  for(const [d,p] of rules) if(host===d||host.endsWith('.'+d)) return p;
  return 'Website';
 }catch{return 'Other';}
}
