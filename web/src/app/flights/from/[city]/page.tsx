import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cities } from "../../../../lib/cities";

type Props = {
  params: { city: string };
};

export const revalidate = 1800; // 30 минут

// 🔥 Предгенерация популярных городов
export async function generateStaticParams() {
  return Object.keys(cities).map((city) => ({ city }));
}

// 🔥 Динамические SEO-мета
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = cities[params.city];

  if (!city) {
    return {};
  }

  return {
    title: `Дешёвые авиабилеты из ${city.nameFrom} — ToTheTrip`,
    description: `Самые дешёвые авиабилеты из ${city.nameFrom} по всем направлениям и датам`,
  };
}

// async function getTickets(cityCode: string) {
//   const res = await fetch(
//     `${process.env.API_URL}/api/site/tickets/from/${cityCode}`,
//     { cache: "force-cache" },
//   );

//   if (!res.ok) {
//     return [];
//   }

//   return res.json();
// }

export default async function Page({ params }: Props) {
  const resolvedParams = await params;
  const city = cities[resolvedParams.city];

  if (!city) {
    notFound();
  }

  //   const tickets = await getTickets(city.code);

  return (
    <main>
      <div className="helloBlock">
        <div className="leftBlock">
          <h1>Дешёвые авиабилеты из {city.nameFrom}</h1>

          <p>
            Мы анализируем цены на авиабилеты из {city.nameFrom} по всем
            направлениям и датам, чтобы найти самые выгодные предложения.
          </p>
        </div>
        <div className="rightBlock">
          <h2>Куда можно улететь дёшево</h2>

          {/* {tickets.length === 0 && <p>Нет доступных билетов</p>} */}

          {/* <ul>
        {tickets.map((t: any) => (
          <li key={t.link}>
            {t.destination} — {t.price} ₽
          </li>
        ))}
      </ul> */}
        </div>
      </div>
    </main>
  );
}
