"use client";

import { BookOpen, FileText, HelpCircle, Info, ScrollText } from "lucide-react";

import { catalogSections, serviceSections } from "@/lib/domain/catalog";

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Как вступить в BIRGE?",
    a: "Зарегистрируйтесь через кнопку «Войти», заполните профиль с факультетом, курсом и навыками, при желании отметьте «Готов(а) к командным проектам».",
  },
  {
    q: "Как добавить проект или идею?",
    a: "Через свой кабинет: слева в обзоре есть форма «Поделиться своей идеей и найти команду». Модераторы проверят и опубликуют запись.",
  },
  {
    q: "Зачем нужна модерация?",
    a: "Мы проверяем проекты и идеи, чтобы лента оставалась полезной и безопасной. Статусы: на рассмотрении → одобрено или отклонено.",
  },
  {
    q: "Как попасть в проект?",
    a: "Откройте проект в разделе «Проекты», нажмите «Присоединиться» или откликнитесь на открытую роль из раздела «Подбор команды».",
  },
  {
    q: "Что даёт стена достижений?",
    a: "Модераторы присваивают достижения за активность и вклад в сообщество. Это признание ваших усилий.",
  },
  {
    q: "Как экспортировать свои данные?",
    a: "В «Настройках» нажмите «Скачать мои данные» — вы получите JSON со всей вашей информацией в BIRGE.",
  },
];

interface HelpScreenProps {
  canModerate: boolean;
}

export function HelpScreen({ canModerate }: HelpScreenProps) {
  const sections = [...catalogSections, ...serviceSections, ...(canModerate ? [{ id: "admin", title: "Модерация" }] : [])];

  return (
    <section className="screen">
      <div className="blockHeader"><div><p className="eyebrow">СПРАВКА</p><h1>Правила и о проекте</h1></div></div>

      <section className="feedGroup">
        <h2><FileText size={20} /> Правила сообщества</h2>
        <ul className="rulesList">
          <li>Уважайте друг друга: без оскорблений, спама и флуда.</li>
          <li>Публикуйте только реальные проекты и идеи, за которые готовы отвечать.</li>
          <li>Контент проходит модерацию; спорные записи могут быть отклонены с пояснением.</li>
          <li>Не публикуйте персональные данные других людей без их согласия.</li>
          <li>Помогайте новичкам — доброжелательность главная ценность BIRGE.</li>
        </ul>
      </section>

      <section className="feedGroup">
        <h2><HelpCircle size={20} /> Частые вопросы</h2>
        <div className="faq">
          {FAQ.map(item => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="feedGroup">
        <h2><BookOpen size={20} /> Путеводитель по разделам</h2>
        <ul className="rulesList">
          {sections.map(section => (
            <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
          ))}
        </ul>
      </section>
    </section>
  );
}