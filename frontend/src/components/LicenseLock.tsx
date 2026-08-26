import { useState } from "react";
import { Link } from "react-router-dom";
import type { LicencaStatus } from "../lib/api";
import { pixQrUrl } from "../lib/pix";

export function LicenseLock({ licenca }: { licenca: LicencaStatus }) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-red-400/30 bg-panel/90 p-6 text-center shadow-2xl sm:p-8">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Mensalidade</p>
      <h1 className="mt-2 font-serif text-3xl text-cream">Sistema bloqueado</h1>
      <p className="mt-3 text-sm text-sand/80">
        A mensalidade venceu e os {licenca.toleranciaDias} dias de tolerância acabaram. Pague o PIX
        abaixo. Depois disso, só quem tem a chave de liberação consegue reabrir o PDV.
      </p>
      <img
        src={pixQrUrl(licenca.mensalidadePixChave, { nome: licenca.mensalidadePixNome })}
        alt="QR PIX mensalidade"
        className="mx-auto mt-6 h-44 w-44 rounded-2xl bg-white p-2"
      />
      <p className="mt-3 font-medium">{licenca.mensalidadePixNome}</p>
      <p className="break-all font-mono text-gold">{licenca.mensalidadePixChave}</p>
      <Link
        to="/mensalidade"
        className="btn-gold mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-gold px-5 py-3 text-sm font-medium text-ink"
      >
        Já paguei — liberar mês
      </Link>
    </div>
  );
}
