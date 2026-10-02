# Metodologia e fidelidade conceitual

## Base pública utilizada

A Netflix descreve publicamente que seu sistema de recomendações utiliza sinais como:

- histórico e avaliações;
- outros assinantes com gostos similares;
- gênero, categorias, atores e ano de lançamento;
- horário de uso;
- idioma preferido;
- dispositivo;
- duração assistida.

A empresa também informa que interações recentes tendem a pesar mais que interações antigas e que a home pode personalizar a escolha das fileiras, os títulos dentro delas e a ordem dos títulos.

Fonte principal: <https://help.netflix.com/pt/node/100639>

## O que esta aplicação não faz

- não reproduz código proprietário da Netflix;
- não afirma conhecer pesos internos reais;
- não usa dados pessoais reais;
- não coleta dados em servidor;
- não usa informações demográficas.

## Objetivo

Tornar observável a lógica geral:

**comportamento → sinais → perfil inferido → score → ranking → exibição → novo comportamento**.
