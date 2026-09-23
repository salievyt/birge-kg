"use client";

import Image from "next/image";

export function Preloader({ active }: { active: boolean }) {
  return (
    <div className={`preloader${active ? "" : " isDone"}`} role="status" aria-label="Загрузка BIRGE">
      <div className="preloaderRing">
        <Image src="/logo.svg" alt="" width={120} height={96} priority />
      </div>
      <p className="preloaderWord">BIRGE</p>
      <span className="preloaderBar">
        <i />
      </span>
      <p className="preloaderSub">Сообщество ОшТУ</p>
    </div>
  );
}