INSERT INTO public.messages (lang, message, "type") VALUES
	('fr', '🚀 Ouverture de {order_type} sur {symbol}, {lots} lots, entrée {open_price} ({created_at})
🎯 Take Profit : {take_profit} | 🛑 Stop Loss : {stop_loss}
Voyons ce qui va se passer.', 'open'),
	('fr', '📈 Entré en {order_type} {symbol} — {lots} lots à {open_price} ({created_at})
🎯 Take Profit : {take_profit} | 🛑 Stop Loss : {stop_loss}
Je pense que le mouvement sera intéressant.', 'open'),
	('fr', '✅ Pris {order_type} sur {symbol}, volume {lots} lots, entrée {open_price}, {created_at}
🎯 Take Profit : {take_profit} | 🛑 Stop Loss : {stop_loss}
Nous garderons un œil dessus.', 'open'),
	('fr', '💹 Commencé la transaction : {order_type} {symbol}, {lots} lots, prix {open_price}, {created_at}
🎯 Take Profit : {take_profit} | 🛑 Stop Loss : {stop_loss}
Je regarde le graphique calmement.', 'open'),
	('fr', '🔔 Position {order_type} sur {symbol} ouverte, {lots} lots à {open_price}, {created_at}
🎯 Take Profit : {take_profit} | 🛑 Stop Loss : {stop_loss}
Voyons où ira le marché.', 'open'),
	('fr', '🎉 Fermé {order_type} sur {symbol} ({lots} lots) avec un profit de **{profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Excellente opération !', 'close_plus'),
	('fr', '🚀 Transaction {order_type} {symbol} ({lots} lots) terminée en gain — **{profit}$**
🕒 {created_at} → {close_time} | 💰 {open_price} → {close_price}
Quel résultat !', 'close_plus'),
	('fr', '✅ Profit sur {order_type} {symbol} ({lots} lots) — **{profit}$**
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Je suis satisfait du résultat.', 'close_plus'),
	('fr', '💹 {order_type} {symbol} ({lots} lots) clôturé en gain: **{profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Bon mouvement capturé.', 'close_plus'),
	('fr', '🔥 Ordre {order_type} sur {symbol} ({lots} lots) a donné **+{profit}$**
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Continuons ainsi !', 'close_plus'),
	('fr', '😕 Fermé {order_type} sur {symbol} ({lots} lots) avec une perte de {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Ça arrive aussi.', 'close_minus'),
	('fr', '📉 Transaction {order_type} {symbol} ({lots} lots) terminée en perte : {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
L’essentiel — contrôler le risque.', 'close_minus'),
	('fr', '🛑 {order_type} {symbol} ({lots} lots) clôturée en perte de {profit}$
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Pas grave, on continue.', 'close_minus'),
	('fr', '🙄 Pas réussi sur {order_type} {symbol} ({lots} lots) — {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
On s’en remettra et on ajustera la stratégie.', 'close_minus'),
	('fr', '❗ Ordre {order_type} sur {symbol} ({lots} lots) a donné une perte de {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
La prochaine fois, ce sera pour nous.', 'close_minus'),
	('fr', '👋 Salut ! Faisons le bilan de la semaine :
📈 Profit : {profit} USD
📉 Pertes : {loss} USD
✅ Résultat net : {net_result} USD
Excellent travail, continue comme ça ! 💪', 'weekly_report'),
	('fr', '🗓️ Semaine terminée :
En gain : {positive_trades} | En perte : {negative_trades}
💰 Résultat : {net_result} USD
On tient bon !', 'weekly_report'),
	('fr', '📅 Semaine clôturée :
+{positive_trades} trades | −{negative_trades} trades
📊 Solde : {net_result} USD
On avance.', 'weekly_report'),
	('fr', '🤝 Bilan de la semaine :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Résultat : {net_result} USD
L’essentiel, c’est la stabilité.', 'weekly_report'),
	('fr', '💬 Cette semaine :
Transactions gagnantes : {positive_trades}
Transactions perdantes : {negative_trades}
💰 Résultat net : {net_result} USD
En avant vers de nouveaux trades !', 'weekly_report'),
	('fr', '👋 Bonjour ! Faisons le bilan du mois :
Nombre total de transactions : {TotalOrders}
Profit : {TotalProfit} USD
Meilleurs instruments : {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Merci d’être avec nous — un nouveau mois et de nouvelles opportunités arrivent ! 🚀', 'monthly_report'),
	('fr', '✨ Le mois est terminé, voyons les résultats :
🔹 Transactions ouvertes : {TotalOrders}
🔹 Résultat total : {TotalProfit} USD
🔹 Meilleure transaction : {BestTradeSymbol} ({BestTradeProfit} USD)
Continuons d’avancer ! 💪', 'monthly_report'),
	('fr', '📈 Revue mensuelle prête !
Nombre de transactions : {TotalOrders}
Solde final : {TotalProfit} USD
Profit maximum d’une transaction : {MaxProfitTrade} USD
Nouveau mois — nouveaux objectifs ! 🔥', 'monthly_report'),
	('fr', '📅 Ce mois-ci nous avons eu :
✔️ Transactions : {TotalOrders}
✔️ Profit/perte : {TotalProfit} USD
✔️ Meilleur actif : {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Merci d’avancer avec nous. Vers de nouvelles victoires ! 🌟', 'monthly_report'),
	('fr', '📝 Résumons le mois :
Nombre total d’opérations : {TotalOrders}
Résultat global : {TotalProfit} USD
Instrument le plus rentable : {BestSymbol} ({BestTradeProfit} USD)
Le mois prochain sera encore meilleur ! 🚀', 'monthly_report'),
	('fr', '📊 Ajusté {symbol} ({order_type}, {lots} lots)
TP: {old_take_profit} → {take_profit} | SL: {old_stop_loss} → {stop_loss}
Surveillons la stratégie mise à jour.', 'position_sltp_update'),
	('fr', '🔄 Mis à jour les niveaux pour {symbol} ({order_type}, {lots} lots)
Take Profit: {old_take_profit} → {take_profit}
Stop Loss: {old_stop_loss} → {stop_loss}
Nous nous adaptons au marché.', 'position_sltp_update'),
	('fr', '⚙️ Paramètres de {symbol} ({order_type}, {lots} lots) modifiés
🎯 TP {old_take_profit} → {take_profit}
🛑 SL {old_stop_loss} → {stop_loss}
Travail avec les nouvelles données.', 'position_sltp_update'),
	('fr', '🛠 Modifications effectuées dans la transaction {symbol} ({order_type}, {lots} lots)
TP: {old_take_profit} → {take_profit}
SL: {old_stop_loss} → {stop_loss}
Voyons l’impact.', 'position_sltp_update'),
	('fr', '📈 Réglé à nouveau l’ordre {symbol} ({order_type}, {lots} lots)
🎯 Take Profit: {old_take_profit} → {take_profit}
🛑 Stop Loss: {old_stop_loss} → {stop_loss}
Attendons la réaction du marché.', 'position_sltp_update'),
	('fr', '👋 Salut ! Faisons le bilan de la semaine :
📈 Profit : {profit} USD
📉 Pertes : {loss} USD
✅ Résultat net : {net_result} USD
Excellent travail, continue comme ça ! 💪

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('fr', '🗓️ Semaine terminée :
En gain : {positive_trades} | En perte : {negative_trades}
💰 Résultat : {net_result} USD
On tient bon !

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('fr', '📅 Semaine clôturée :
+{positive_trades} trades | −{negative_trades} trades
📊 Solde : {net_result} USD
On avance.

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('fr', '🤝 Bilan de la semaine :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Résultat : {net_result} USD
L’essentiel, c’est la stabilité.

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('fr', '💬 Cette semaine :
Transactions gagnantes : {positive_trades}
Transactions perdantes : {negative_trades}
💰 Résultat net : {net_result} USD
En avant vers de nouveaux trades !

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('fr', '💬 Cette semaine :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Résultat net : {net_result} USD
✅ Trades gagnants : {positive_trades}
❌ Trades perdants : {negative_trades}

— — —

🟣 Référence sans filtrage (même semaine)
📈 Gain : {vip_profit} USD
📉 Perte : {vip_loss} USD
💹 Résultat : {vip_net_result} USD
✅ Trades gagnants : {vip_positive_trades}
❌ Trades perdants : {vip_negative_trades}
Tu veux pareil ? Désactive le filtrage dans /filter.', 'weekly_report_3'),
	('fr', '🗓️ Bilan hebdomadaire :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Net : {net_result} USD
✅ Gagnants : {positive_trades}
❌ Perdants : {negative_trades}

— — —

🟣 Benchmark sans filtrage
📈 Gain : {vip_profit} USD
📉 Perte : {vip_loss} USD
💹 Résultat : {vip_net_result} USD
✅ Gagnants : {vip_positive_trades}
❌ Perdants : {vip_negative_trades}
Tu veux pareil ? Désactive le filtrage dans /filter.', 'weekly_report_3'),
	('fr', '📅 Semaine clôturée :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Net : {net_result} USD
✅ Trades gagnants : {positive_trades}
❌ Trades perdants : {negative_trades}

— — —

🟣 Référence (sans filtrage)
📈 Gain : {vip_profit} USD
📉 Perte : {vip_loss} USD
💹 Résultat : {vip_net_result} USD
✅ Trades gagnants : {vip_positive_trades}
❌ Trades perdants : {vip_negative_trades}
Tu veux les mêmes résultats ? Désactive le filtrage dans /filter.', 'weekly_report_3'),
	('fr', '🤝 Résultats de la semaine :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Résultat net : {net_result} USD
✅ Gagnants : {positive_trades}
❌ Perdants : {negative_trades}

— — —

🟣 Benchmark (sans filtrage)
📈 Gain : {vip_profit} USD
📉 Perte : {vip_loss} USD
💹 Résultat : {vip_net_result} USD
✅ Gagnants : {vip_positive_trades}
❌ Perdants : {vip_negative_trades}
Tu veux les mêmes résultats ? Désactive le filtrage dans /filter.', 'weekly_report_3'),
	('fr', '📊 *Lot de signaux de trading*

Vous avez reçu {count} signaux:

{{#each signals}}
{emoji} *Signal #{index}*
📈 Symbole: {symbol}
📍 Événement: {eventType}
💰 Profit: {profit}
📅 Heure: {time}
---
{{/each}}

Total des signaux: {count}
Bot: {botName}', 'batch_signals');
