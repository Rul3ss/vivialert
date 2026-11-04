import { useCallback, useEffect, useState } from 'react';
import * as api from '../api';
import { mensagemDeErro } from '../format';
import type { Alert, CheckResult, CreateAlertInput } from '../types';

/**
 * Fonte única de verdade do alerta: toda mutação confirma no servidor e só
 * então atualiza o estado local (nada de otimismo que possa divergir).
 *
 * Existe **um alerta só** (limitação da API de preço), então o estado é um
 * `Alert | null` em vez de uma lista.
 */
export function useAlerts() {
  const [alerta, setAlerta] = useState<Alert | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      setAlerta(await api.getAlert());
      setErro(null);
    } catch (causa) {
      setErro(mensagemDeErro(causa));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  async function criar(input: CreateAlertInput) {
    const criado = await api.createAlert(input);
    setAlerta(criado);
    return criado;
  }

  async function alternarAtivo(atual: Alert) {
    setAlerta(await api.updateAlert(atual.id, { active: !atual.active }));
  }

  async function alterarAlvo(id: string, targetPrice: number) {
    setAlerta(await api.updateAlert(id, { targetPrice }));
  }

  async function excluir(id: string) {
    await api.deleteAlert(id);
    setAlerta(null);
  }

  async function checar(id: string): Promise<CheckResult> {
    const resultado = await api.checkPrice(id);
    // O check grava lastCheckedAt/lastNotified*/lastError no servidor: usamos o
    // alerta que veio na resposta em vez de adivinhar o estado aqui.
    setAlerta(resultado.alert);
    return resultado;
  }

  return {
    alerta,
    carregando,
    erro,
    recarregar,
    criar,
    alternarAtivo,
    alterarAlvo,
    excluir,
    checar,
  };
}
