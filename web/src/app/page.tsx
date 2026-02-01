import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Дешёвые авиабилеты по всем направлениям — ToTheTrip",
  description:
    "Дешёвые авиабилеты из всех городов по всем направлениям и датам. Ищем самые выгодные перелёты каждый день.",
};

export default function HomePage() {
  return (
    <main>
      <section className="heroBlock">
        <div className="leftBlock">
          <h1>Дешёвые авиабилеты по всем направлениям</h1>
          <p>
            Мы собираем самые дешёвые авиабилеты из разных городов по всем
            направлениям и датам. Здесь вы можете узнать, куда можно улететь
            дешевле всего без сложного поиска.
          </p>
          <p>
            Все цены основаны на актуальных данных и обновляются регулярно.
            Выбирайте направление, дату и находите выгодные варианты перелётов.
          </p>
        </div>
        <div className="rightBlock">
          <h2>Популярные города вылета</h2>
          <ul>
            <li>
              <Link href="/flights/from/saint-petersburg">Санкт-Петербург</Link>
            </li>
            <li>
              <Link href="/flights/from/moscow">Москва</Link>
            </li>
            <li>
              <Link href="/flights/from/kazan">Казань</Link>
            </li>
            <li>
              <Link href="/flights/from/sochi">Сочи</Link>
            </li>
          </ul>
        </div>
      </section>

      <section className="squareCardsBlock">
        <h2>Популярные направления в этом месяце</h2>
        <div className="squareCardsGrid">
          <div className="squareCard">
            <div className="imgPlaceholder">🏙️</div>
            <span>Москва</span>
          </div>
          <div className="squareCard">
            <div className="imgPlaceholder">🌉</div>
            <span>Санкт-Петербург</span>
          </div>
          <div className="squareCard">
            <div className="imgPlaceholder">🏰</div>
            <span>Казань</span>
          </div>
          <div className="squareCard">
            <div className="imgPlaceholder">🏖️</div>
            <span>Сочи</span>
          </div>
          <div className="squareCard">
            <div className="imgPlaceholder">🏔️</div>
            <span>Екатеринбург</span>
          </div>
          <div className="squareCard">
            <div className="imgPlaceholder">✈️</div>
            <span>Минск</span>
          </div>
        </div>
      </section>

      <section className="featuresBlock">
        <h2>Почему выбирают нас</h2>
        <div className="featuresGrid">
          <div className="featureCard">
            <h3>Быстрый поиск</h3>
            <p>Находите лучшие предложения за секунды.</p>
          </div>
          <div className="featureCard">
            <h3>Актуальные цены</h3>
            <p>Данные обновляются в реальном времени.</p>
          </div>
          <div className="featureCard">
            <h3>Простота бронирования</h3>
            <p>Бронируйте билеты прямо на сайте без сложностей.</p>
          </div>
          <div className="featureCard">
            <h3>Поддержка 24/7</h3>
            <p>Всегда готовы помочь с любым вопросом.</p>
          </div>
        </div>
      </section>

      <section className="popularDestinations">
        <h2>Популярные направления</h2>
        <div className="destinationsGrid">
          <div className="destinationCard">Москва</div>
          <div className="destinationCard">Санкт-Петербург</div>
          <div className="destinationCard">Казань</div>
          <div className="destinationCard">Сочи</div>
          <div className="destinationCard">Минск</div>
          <div className="destinationCard">Екатеринбург</div>
        </div>
      </section>

      <section className="ctaBlock">
        <h2>Начните искать билеты прямо сейчас</h2>
        <p>Введите город вылета и получите лучшие предложения мгновенно.</p>
        <button>Поиск билетов</button>
      </section>
    </main>
  );
}
