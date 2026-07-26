/**
 * Blog content source. Kept as typed in-repo data for now (no CMS) — drives /blog, /blog/[slug],
 * their Article JSON-LD, and the dynamic sitemap. Add real posts here; each becomes a static page
 * (revalidated hourly via ISR). Bodies are grounded in the product's actual legal corpus.
 */
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  datePublished: string; // ISO 8601 (YYYY-MM-DD)
  dateModified?: string;
  readingMinutes: number;
  /** Body as an ordered list of paragraphs (rendered as <p>). */
  body: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "deposit-cap",
    title: "מהי תקרת הפיקדון בחוזה שכירות לפי החוק?",
    description:
      "חוק השכירות והשאילה מגביל את גובה הערובה (הפיקדון) שמשכיר רשאי לדרוש. כך בודקים אם סעיף הפיקדון בחוזה שלכם חורג מהתקרה.",
    datePublished: "2026-07-20",
    readingMinutes: 3,
    body: [
      "אחד הסעיפים שהכי כדאי לבדוק בחוזה שכירות הוא סעיף הפיקדון — או בשמו החוקי, הערובה. חוק השכירות והשאילה קובע תקרה מפורשת לגובה הערובה שמשכיר רשאי לדרוש משוכר בשכירות למגורים.",
      "לפי החוק, הערובה לא תעלה על הנמוך מבין שניים: שליש מסך דמי השכירות לכל תקופת השכירות, או דמי שכירות של שלושה חודשים. כלומר, אם דמי השכירות החודשיים הם 5,000 ₪, שלושה חודשי שכירות הם 15,000 ₪ — וזו התקרה הרלוונטית בחוזה קצר.",
      "מעבר לגובה, החוק גם מגביל מתי ובאילו תנאים אפשר לחלט את הערובה: רק להבטחת חיובים שהשוכר לא קיים, ובהתאם למה שהוגדר מראש. ניסוח כללי כמו ״בניכוי חובות אם קיימים״ עלול להיות רחב מהמותר.",
      "כדי לבדוק את הסעיף שלכם, השוו את סכום הערובה בחוזה מול דמי השכירות החודשיים. אם הסכום עולה על התקרה — זהו דגל אדום. ב-LeaseLens אפשר להעלות את החוזה ולקבל את הבדיקה הזו אוטומטית, עם הפניה לסעיף המדויק בחוק ובחוזה.",
      "האמור כאן הוא מידע כללי ואינו ייעוץ משפטי.",
    ],
  },
];

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
}

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
