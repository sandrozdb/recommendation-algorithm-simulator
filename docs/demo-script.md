# Roteiro de demonstração — 3 minutos

## 1. Cold start — 30 a 40s

Abra a aplicação pelo botão **Resetar demo** e diga:

> “Até aqui eu mostrei o conceito em slides. Mas recomendação fica muito mais fácil de entender quando a gente vê acontecendo. Então eu construí uma simulação.”

Escolha três títulos com alguma afinidade em comum e crie o feed.

Explique:

> “Eu não declarei uma preferência em texto. O sistema recebeu apenas três escolhas iniciais e, a partir delas, criou o primeiro ranking.”

## 2. Gere um novo sinal — 50 a 60s

Abra a primeira recomendação e escolha uma ação como **Até o fim**, **Gostei** ou **Amei**.

Mostre o feedback visual de recálculo e diga:

> “Agora entrou um novo sinal. Esse título alimenta o perfil inferido, sai da fila principal porque já foi consumido e outro conteúdo assume a recomendação.”

Se houver movimento no ranking, destaque que alguns títulos sobem e outros descem.

## 3. Mostre o Raio-X — 60s

Abra **Raio-X** e mostre:

- o perfil inferido em escala relativa de 0 a 100;
- os últimos sinais, incluindo as escolhas de cold start;
- o ranking atual;
- os quatro componentes do score.

Explique a fórmula:

```text
Total = Similaridade + Popularidade + Recência + Exploração
```

Reforce que o total é didático e não representa probabilidade real.

## 4. Mude o objetivo — 30s

Mova o controle de diversidade e diga:

> “O perfil do usuário não mudou. O que mudou foi o objetivo do ranking. Ao pedir mais diversidade, o sistema aceita explorar conteúdos um pouco mais fora do padrão já conhecido.”

## 5. Fechamento — 20 a 30s

> “O que acabamos de ver resume o ciclo: comportamento gera sinais, sinais alteram o perfil e o ranking, e o ranking altera aquilo que ganha visibilidade.”

Feche com a provocação:

> “Se o algoritmo aprende com o nosso comportamento, até que ponto o nosso comportamento também é influenciado por aquilo que ele escolhe mostrar?”
