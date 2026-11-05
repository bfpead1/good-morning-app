// Daily thoughts: scripture, Church leaders, and well-sourced quotes.
// Quotes that are widely misattributed online were left out on purpose; lines that are
// popularly but loosely attributed say "attributed" in the source.

export type Thought = { text: string; source: string };

export const THOUGHTS: Thought[] = [
  // ─── Book of Mormon ─────────────────────────────────────────────────────
  { text: "By small and simple things are great things brought to pass.", source: "Alma 37:6" },
  { text: "Counsel with the Lord in all thy doings, and he will direct thee for good.", source: "Alma 37:37" },
  { text: "See that all these things are done in wisdom and order; for it is not requisite that a man should run faster than he has strength.", source: "Mosiah 4:27" },
  { text: "When ye are in the service of your fellow beings ye are only in the service of your God.", source: "Mosiah 2:17" },
  { text: "If they humble themselves before me, and have faith in me, then will I make weak things become strong unto them.", source: "Ether 12:27" },
  { text: "Dispute not because ye see not, for ye receive no witness until after the trial of your faith.", source: "Ether 12:6" },
  { text: "Adam fell that men might be; and men are, that they might have joy.", source: "2 Nephi 2:25" },
  { text: "I will go and do the things which the Lord hath commanded, for I know that the Lord giveth no commandments unto the children of men, save he shall prepare a way for them.", source: "1 Nephi 3:7" },
  { text: "Ye must press forward with a steadfastness in Christ, having a perfect brightness of hope, and a love of God and of all men.", source: "2 Nephi 31:20" },
  { text: "Ye must pray always, and not faint.", source: "2 Nephi 32:9" },
  { text: "Line upon line, precept upon precept, here a little and there a little.", source: "2 Nephi 28:30" },
  { text: "This life is the time for men to prepare to meet God; yea, behold the day of this life is the day for men to perform their labors.", source: "Alma 34:32" },
  { text: "If ye have faith ye hope for things which are not seen, which are true.", source: "Alma 32:21" },
  { text: "Learn wisdom in thy youth; yea, learn in thy youth to keep the commandments of God.", source: "Alma 37:35" },
  { text: "See that ye bridle all your passions, that ye may be filled with love.", source: "Alma 38:12" },
  { text: "I know that I am nothing; as to my strength I am weak; ... but I will boast of my God, for in his strength I can do all things.", source: "Alma 26:12" },
  { text: "Consider on the blessed and happy state of those that keep the commandments of God.", source: "Mosiah 2:41" },
  { text: "It is upon the rock of our Redeemer, who is Christ, the Son of God, that ye must build your foundation.", source: "Helaman 5:12" },
  { text: "Come unto Christ, and be perfected in him.", source: "Moroni 10:32" },

  // ─── Bible ──────────────────────────────────────────────────────────────
  { text: "I can do all things through Christ which strengtheneth me.", source: "Philippians 4:13" },
  { text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest.", source: "Joshua 1:9" },
  { text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.", source: "Proverbs 3:5–6" },
  { text: "They that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", source: "Isaiah 40:31" },
  { text: "Let us not be weary in well doing: for in due season we shall reap, if we faint not.", source: "Galatians 6:9" },
  { text: "God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.", source: "2 Timothy 1:7" },
  { text: "Commit thy works unto the Lord, and thy thoughts shall be established.", source: "Proverbs 16:3" },
  { text: "Whatsoever thy hand findeth to do, do it with thy might.", source: "Ecclesiastes 9:10" },
  { text: "Know ye not that they which run in a race run all, but one receiveth the prize? So run, that ye may obtain.", source: "1 Corinthians 9:24" },
  { text: "Let us run with patience the race that is set before us.", source: "Hebrews 12:1" },
  { text: "This is the day which the Lord hath made; we will rejoice and be glad in it.", source: "Psalm 118:24" },
  { text: "His compassions fail not. They are new every morning: great is thy faithfulness.", source: "Lamentations 3:22–23" },
  { text: "Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself.", source: "Matthew 6:34" },
  { text: "Choose you this day whom ye will serve.", source: "Joshua 24:15" },
  { text: "Forgetting those things which are behind, and reaching forth unto those things which are before, I press toward the mark.", source: "Philippians 3:13–14" },
  { text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee.", source: "Isaiah 41:10" },
  { text: "Be still, and know that I am God.", source: "Psalm 46:10" },
  { text: "Though our outward man perish, yet the inward man is renewed day by day.", source: "2 Corinthians 4:16" },
  { text: "In the world ye shall have tribulation: but be of good cheer; I have overcome the world.", source: "John 16:33" },

  // ─── Doctrine and Covenants ─────────────────────────────────────────────
  { text: "Be not weary in well-doing, for ye are laying the foundation of a great work. And out of small things proceedeth that which is great.", source: "D&C 64:33" },
  { text: "Men should be anxiously engaged in a good cause, and do many things of their own free will, and bring to pass much righteousness.", source: "D&C 58:27" },
  { text: "Let us cheerfully do all things that lie in our power; and then may we stand still, with the utmost assurance, to see the salvation of God.", source: "D&C 123:17" },
  { text: "Retire to thy bed early, that ye may not be weary; arise early, that your bodies and your minds may be invigorated.", source: "D&C 88:124" },
  { text: "And shall run and not be weary, and shall walk and not faint.", source: "D&C 89:20" },
  { text: "Look unto me in every thought; doubt not, fear not.", source: "D&C 6:36" },
  { text: "Search diligently, pray always, and be believing, and all things shall work together for your good.", source: "D&C 90:24" },
  { text: "My son, peace be unto thy soul; thine adversity and thine afflictions shall be but a small moment.", source: "D&C 121:7" },

  // ─── Church leaders ─────────────────────────────────────────────────────
  { text: "Joy has little to do with the circumstances of our lives and everything to do with the focus of our lives.", source: "Russell M. Nelson, “Joy and Spiritual Survival,” Oct. 2016" },
  { text: "Think celestial!", source: "Russell M. Nelson, “Think Celestial!,” Oct. 2023" },
  { text: "The future is as bright as your faith.", source: "Thomas S. Monson, “Be of Good Cheer,” Apr. 2009" },
  { text: "Decisions determine destiny.", source: "Thomas S. Monson" },
  { text: "Doubt your doubts before you doubt your faith.", source: "Dieter F. Uchtdorf, “Come, Join with Us,” Oct. 2013" },
  { text: "Some blessings come soon, some come late, and some don't come until heaven; but for those who embrace the gospel of Jesus Christ, they come.", source: "Jeffrey R. Holland, “An High Priest of Good Things to Come,” Oct. 1999" },
  { text: "However late you think you are, however many chances you think you have missed ... you have not traveled beyond the reach of divine love.", source: "Jeffrey R. Holland, “The Laborers in the Vineyard,” Apr. 2012" },
  { text: "Just because something is good is not a sufficient reason for doing it.", source: "Dallin H. Oaks, “Good, Better, Best,” Oct. 2007" },
  { text: "Come what may, and love it.", source: "Joseph B. Wirthlin, Oct. 2008" },
  { text: "God does not begin by asking us about our ability, but only about our availability, and if we then prove our dependability, he will increase our capability.", source: "Neal A. Maxwell (attributed)" },
  { text: "Lengthen your stride.", source: "Spencer W. Kimball" },
  { text: "You can't plow a field by turning it over in your mind.", source: "Gordon B. Hinckley (quoting a proverb)" },
  { text: "Choose the harder right instead of the easier wrong.", source: "West Point Cadet Prayer, often quoted by Thomas S. Monson" },

  // ─── Discipline & habits ────────────────────────────────────────────────
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", source: "Will Durant, summarizing Aristotle in The Story of Philosophy" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", source: "James Clear, Atomic Habits" },
  { text: "Every action you take is a vote for the type of person you wish to become.", source: "James Clear, Atomic Habits" },
  { text: "Discipline equals freedom.", source: "Jocko Willink" },
  { text: "Only the disciplined ones in life are free. If you are undisciplined, you are a slave to your moods and your passions.", source: "Eliud Kipchoge" },
  { text: "No human is limited.", source: "Eliud Kipchoge" },
  { text: "Discipline is the bridge between goals and accomplishment.", source: "Jim Rohn (attributed)" },
  { text: "People often say that motivation doesn't last. Well, neither does bathing—that's why we recommend it daily.", source: "Zig Ziglar" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", source: "Jim Ryun (attributed)" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", source: "Robert Collier" },
  { text: "Great works are performed not by strength but by perseverance.", source: "Samuel Johnson, Rasselas" },
  { text: "Well done is better than well said.", source: "Benjamin Franklin, Poor Richard's Almanack" },
  { text: "Lost time is never found again.", source: "Benjamin Franklin, Poor Richard's Almanack" },
  { text: "Do the thing, and you shall have the power.", source: "Ralph Waldo Emerson, “Compensation”" },

  // ─── Effort & perseverance ──────────────────────────────────────────────
  { text: "Nothing in the world is worth having or worth doing unless it means effort, pain, difficulty.", source: "Theodore Roosevelt, 1903" },
  { text: "Do what you can, with what you have, where you are.", source: "Theodore Roosevelt, quoting Squire Bill Widener" },
  { text: "Keep your eyes on the stars, and your feet on the ground.", source: "Theodore Roosevelt, 1904" },
  { text: "It is not the critic who counts ... The credit belongs to the man who is actually in the arena.", source: "Theodore Roosevelt, “Citizenship in a Republic,” 1910" },
  { text: "If you can't fly then run, if you can't run then walk, if you can't walk then crawl, but whatever you do you have to keep moving forward.", source: "Martin Luther King Jr., 1967" },
  { text: "If there is no struggle, there is no progress.", source: "Frederick Douglass, 1857" },
  { text: "Success is to be measured not so much by the position that one has reached in life as by the obstacles which he has overcome.", source: "Booker T. Washington, Up from Slavery" },
  { text: "Always bear in mind that your own resolution to succeed is more important than any other one thing.", source: "Abraham Lincoln, letter to Isham Reavis, 1855" },
  { text: "You must do the thing you think you cannot do.", source: "Eleanor Roosevelt, You Learn by Living" },
  { text: "Optimism is the faith that leads to achievement. Nothing can be done without hope and confidence.", source: "Helen Keller, Optimism" },
  { text: "It always seems impossible until it's done.", source: "Nelson Mandela (attributed)" },
  { text: "Whether you think you can, or you think you can't—you're right.", source: "Henry Ford (attributed)" },
  { text: "Start where you are. Use what you have. Do what you can.", source: "Arthur Ashe (attributed)" },
  { text: "Genius is one percent inspiration, ninety-nine percent perspiration.", source: "Thomas Edison (attributed)" },

  // ─── Sport & training ───────────────────────────────────────────────────
  { text: "To give anything less than your best is to sacrifice the gift.", source: "Steve Prefontaine" },
  { text: "I've failed over and over and over again in my life. And that is why I succeed.", source: "Michael Jordan" },
  { text: "You miss 100% of the shots you don't take.", source: "Wayne Gretzky" },
  { text: "Don't let what you cannot do interfere with what you can do.", source: "John Wooden" },
  { text: "Make each day your masterpiece.", source: "John Wooden, from his father's creed" },
  { text: "Be quick, but don't hurry.", source: "John Wooden" },
  { text: "Things turn out best for the people who make the best of the way things turn out.", source: "John Wooden" },
  { text: "Failure is not fatal, but failure to change might be.", source: "John Wooden" },
  { text: "I hated every minute of training, but I said, 'Don't quit. Suffer now and live the rest of your life as a champion.'", source: "Muhammad Ali (attributed)" },
  { text: "It ain't about how hard you hit. It's about how hard you can get hit and keep moving forward.", source: "Rocky Balboa (2006)" },
  { text: "If you want to run, run a mile. If you want to experience a different life, run a marathon.", source: "Emil Zátopek" },
  { text: "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.", source: "Bruce Lee (attributed)" },
  { text: "Ability is what you're capable of doing. Motivation determines what you do. Attitude determines how well you do it.", source: "Lou Holtz" },

  // ─── Stoics & classics ──────────────────────────────────────────────────
  { text: "The impediment to action advances action. What stands in the way becomes the way.", source: "Marcus Aurelius, Meditations 5.20" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", source: "Marcus Aurelius, Meditations 10.16" },
  { text: "We are more often frightened than hurt; and we suffer more from imagination than from reality.", source: "Seneca, Letters 13" },
  { text: "It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.", source: "Seneca, Letters 104" },
  { text: "While we are postponing, life speeds by.", source: "Seneca, Letters 1" },
  { text: "First say to yourself what you would be; and then do what you have to do.", source: "Epictetus, Discourses 3.23" },
  { text: "The journey of a thousand miles begins with one step.", source: "Laozi, Tao Te Ching 64" },
  { text: "When we are no longer able to change a situation, we are challenged to change ourselves.", source: "Viktor Frankl, Man's Search for Meaning" },

  // ─── Time & purpose ─────────────────────────────────────────────────────
  { text: "All we have to decide is what to do with the time that is given us.", source: "J.R.R. Tolkien, The Fellowship of the Ring" },
  { text: "How we spend our days is, of course, how we spend our lives.", source: "Annie Dillard, The Writing Life" },
  { text: "Tell me, what is it you plan to do with your one wild and precious life?", source: "Mary Oliver, “The Summer Day”" },
  { text: "If one advances confidently in the direction of his dreams ... he will meet with a success unexpected in common hours.", source: "Henry David Thoreau, Walden" },
  { text: "Plans are worthless, but planning is everything.", source: "Dwight D. Eisenhower, 1957" },
  { text: "Time is the scarcest resource, and unless it is managed, nothing else can be managed.", source: "Peter Drucker, The Effective Executive" },

  // ─── Proverbs ───────────────────────────────────────────────────────────
  { text: "The best time to plant a tree was twenty years ago. The second best time is now.", source: "Proverb" },
  { text: "Fall seven times, stand up eight.", source: "Japanese proverb" },
  { text: "A smooth sea never made a skilled sailor.", source: "English proverb" },
  { text: "Slow and steady wins the race.", source: "Aesop, “The Tortoise and the Hare”" },
];

/** Same thought all day, a different one each day, cycling through the whole list. */
export function thoughtForDate(date = new Date()) {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * 60 * 60 * 1000),
  );
  // Stride through the list so consecutive days don't share a category.
  const index = (dayNumber * 37) % THOUGHTS.length;
  return THOUGHTS[index];
}
