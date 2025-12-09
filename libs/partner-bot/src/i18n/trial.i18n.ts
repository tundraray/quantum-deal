/**
 * Trial Scene Internationalization
 *
 * Multi-language support for trial-related messages
 *
 * Key naming convention:
 * - partner_trial_activated - Trial activation success message
 * - partner_trial_expired - Trial expiration message
 * - partner_trial_status - Current trial status message
 * - partner_coming_soon - Feature coming soon placeholder
 */

import type { I18nMessages } from '@quantumdeal/framework';

/**
 * Trial i18n namespace identifier
 * Used when registering with LocalizationService
 */
export const TRIAL_I18N_NAMESPACE = 'trial';

/**
 * Trial messages in format compatible with LocalizationService.registerI18n()
 */
export const trialMessages: I18nMessages = {
  en: {
    partner_trial_activated: `✅ <b>Success! Trial Activated</b>

You now have <b>{daysRemaining} days</b> of full access until {expiryDate}.

🔥 <b>You're all set!</b> Premium signals will now flow directly into this chat. Get ready for your next winning trade! 💸

Enjoy! 🎉`,
    partner_trial_expired: `⌛ <b>Trial Period Expired</b>

Your free access ended on {expiryDate}. You are now missing out on:
❌ Premium Buy/Sell Signals
❌ Real-time Market Alerts
❌ Exclusive Trading Strategies

<b>Don't leave money on the table!</b> 📉

Renew your subscription NOW to restore full access immediately! 👇`,
    partner_trial_status: `💎 <b>Premium Access Active</b>

You have <b>{daysRemaining} days</b> left to profit from our exclusive signals! 📈

Expires: {expiryDate}

Make them count! 🚀`,
    partner_coming_soon: `🚧 <b>Coming Soon</b>

We're working on this! Stay tuned.`,
  },

  ru: {
    partner_trial_activated: `✅ <b>Успех! Пробный период активирован</b>

Теперь у вас есть <b>{daysRemaining} дней</b> полного доступа до {expiryDate}.

🔥 <b>Все готово!</b> Премиум сигналы теперь будут поступать прямо в этот чат. Готовьтесь к вашей следующей успешной сделке! 💸

Наслаждайтесь! 🎉`,
    partner_trial_expired: `⌛ <b>Пробный период истек</b>

Ваш бесплатный доступ закончился {expiryDate}. Теперь вы упускаете:
❌ Премиум сигналы на покупку/продажу
❌ Оповещения о рынке в реальном времени
❌ Эксклюзивные торговые стратегии

<b>Не упускайте прибыль!</b> 📉

Продлите подписку СЕЙЧАС, чтобы немедленно восстановить полный доступ! 👇`,
    partner_trial_status: `💎 <b>Премиум доступ активен</b>

У вас осталось <b>{daysRemaining} дней</b> для получения прибыли от наших эксклюзивных сигналов! 📈

Истекает: {expiryDate}

Используйте их с умом! 🚀`,
    partner_coming_soon: `🚧 <b>Скоро</b>

Мы работаем над этим! Следите за обновлениями.`,
  },

  uk: {
    partner_trial_activated: `✅ <b>Успіх! Пробний період активовано</b>

Тепер у вас є <b>{daysRemaining} днів</b> повного доступу до {expiryDate}.

🔥 <b>Все готово!</b> Преміум сигнали тепер надходитимуть прямо в цей чат. Готуйтесь до вашої наступної успішної угоди! 💸

Насолоджуйтесь! 🎉`,
    partner_trial_expired: `⌛ <b>Пробний період закінчився</b>

Ваш безкоштовний доступ закінчився {expiryDate}. Тепер ви пропускаєте:
❌ Преміум сигнали на купівлю/продаж
❌ Сповіщення про ринок у реальному часі
❌ Ексклюзивні торгові стратегії

<b>Не втрачайте прибуток!</b> 📉

Продовжіть підписку ЗАРАЗ, щоб негайно відновити повний доступ! 👇`,
    partner_trial_status: `💎 <b>Преміум доступ активний</b>

У вас залишилось <b>{daysRemaining} днів</b> для отримання прибутку від наших ексклюзивних сигналів! 📈

Закінчується: {expiryDate}

Використовуйте їх розумно! 🚀`,
    partner_coming_soon: `🚧 <b>Незабаром</b>

Ми працюємо над цим! Слідкуйте за оновленнями.`,
  },

  hi: {
    partner_trial_activated: `✅ <b>सफलता! ट्रायल सक्रिय हो गया</b>

अब आपके पास {expiryDate} तक <b>{daysRemaining} दिनों</b> की पूर्ण पहुंच है।

🔥 <b>आप पूरी तरह तैयार हैं!</b> प्रीमियम सिग्नल अब सीधे इस चैट में आएंगे। अपने अगले जीतने वाले ट्रेड के लिए तैयार हो जाइए! 💸

आनंद लें! 🎉`,
    partner_trial_expired: `⌛ <b>ट्रायल अवधि समाप्त</b>

आपकी मुफ्त पहुंच {expiryDate} को समाप्त हो गई। अब आप चूक रहे हैं:
❌ प्रीमियम खरीदें/बेचें सिग्नल
❌ रियल-टाइम मार्केट अलर्ट
❌ विशेष ट्रेडिंग रणनीतियां

<b>पैसे मेज पर मत छोड़िए!</b> 📉

तुरंत पूर्ण पहुंच बहाल करने के लिए अभी अपनी सदस्यता नवीनीकृत करें! 👇`,
    partner_trial_status: `💎 <b>प्रीमियम एक्सेस सक्रिय</b>

आपके पास हमारे विशेष सिग्नल से लाभ कमाने के लिए <b>{daysRemaining} दिन</b> बचे हैं! 📈

समाप्ति: {expiryDate}

इन्हें सार्थक बनाएं! 🚀`,
    partner_coming_soon: `🚧 <b>जल्द आ रहा है</b>

हम इस पर काम कर रहे हैं! अपडेट के लिए बने रहें।`,
  },

  fr: {
    partner_trial_activated: `✅ <b>Succes! Essai active</b>

Vous avez maintenant <b>{daysRemaining} jours</b> d'acces complet jusqu'au {expiryDate}.

🔥 <b>Vous etes pret!</b> Les signaux premium arriveront directement dans ce chat. Preparez-vous pour votre prochaine transaction gagnante! 💸

Profitez-en! 🎉`,
    partner_trial_expired: `⌛ <b>Periode d'essai expiree</b>

Votre acces gratuit s'est termine le {expiryDate}. Vous manquez maintenant:
❌ Signaux Premium d'Achat/Vente
❌ Alertes de Marche en Temps Reel
❌ Strategies de Trading Exclusives

<b>Ne laissez pas d'argent sur la table!</b> 📉

Renouvelez votre abonnement MAINTENANT pour restaurer l'acces complet immediatement! 👇`,
    partner_trial_status: `💎 <b>Acces Premium Actif</b>

Il vous reste <b>{daysRemaining} jours</b> pour profiter de nos signaux exclusifs! 📈

Expire: {expiryDate}

Faites-les compter! 🚀`,
    partner_coming_soon: `🚧 <b>Bientot disponible</b>

Nous travaillons dessus! Restez a l'ecoute.`,
  },

  kk: {
    partner_trial_activated: `✅ <b>Сәттілік! Сынақ мерзімі белсендірілді</b>

Сізде {expiryDate} дейін <b>{daysRemaining} күн</b> толық қолжетімділік бар.

🔥 <b>Барлығы дайын!</b> Премиум сигналдар енді осы чатқа тікелей келеді. Келесі табысты мәмілеңізге дайын болыңыз! 💸

Ләззат алыңыз! 🎉`,
    partner_trial_expired: `⌛ <b>Сынақ мерзімі аяқталды</b>

Сіздің тегін қолжетімділігіңіз {expiryDate} аяқталды. Енді сіз жіберіп жатырсыз:
❌ Премиум Сатып алу/Сату сигналдары
❌ Нақты уақыттағы нарық ескертулері
❌ Эксклюзивті сауда стратегиялары

<b>Ақшаңызды жіберіп алмаңыз!</b> 📉

Толық қолжетімділікті дереу қалпына келтіру үшін жазылымыңызды ҚАЗІР жаңартыңыз! 👇`,
    partner_trial_status: `💎 <b>Премиум қолжетімділік белсенді</b>

Біздің эксклюзивті сигналдардан пайда табу үшін сізде <b>{daysRemaining} күн</b> қалды! 📈

Аяқталады: {expiryDate}

Оларды пайдаланыңыз! 🚀`,
    partner_coming_soon: `🚧 <b>Жақында</b>

Біз бұл үстінде жұмыс істеудеміз! Жаңартуларды күтіңіз.`,
  },

  uz: {
    partner_trial_activated: `✅ <b>Muvaffaqiyat! Sinov muddati faollashtirildi</b>

Endi sizda {expiryDate} gacha <b>{daysRemaining} kun</b> to'liq kirish huquqi bor.

🔥 <b>Hammasi tayyor!</b> Premium signallar endi to'g'ridan-to'g'ri ushbu chatga keladi. Keyingi yutuqli savdongizga tayyorlaning! 💸

Zavqlaning! 🎉`,
    partner_trial_expired: `⌛ <b>Sinov muddati tugadi</b>

Sizning bepul kirishingiz {expiryDate} da tugadi. Endi siz quyidagilarni o'tkazib yuboryapsiz:
❌ Premium Sotib olish/Sotish signallari
❌ Real vaqtda bozor ogohlantirishlari
❌ Eksklyuziv savdo strategiyalari

<b>Pulni stolda qoldirmang!</b> 📉

To'liq kirishni darhol tiklash uchun obunangizni HOZIR yangilang! 👇`,
    partner_trial_status: `💎 <b>Premium kirish faol</b>

Bizning eksklyuziv signallarimizdan foyda olish uchun sizda <b>{daysRemaining} kun</b> qoldi! 📈

Tugaydi: {expiryDate}

Ulardan foydalaning! 🚀`,
    partner_coming_soon: `🚧 <b>Tez kunda</b>

Biz bu ustida ishlayapmiz! Yangilanishlarni kuting.`,
  },

  tg: {
    partner_trial_activated: `✅ <b>Муваффақият! Давраи санҷишӣ фаъол шуд</b>

Акнун шумо то {expiryDate} <b>{daysRemaining} рӯз</b> дастрасии пурра доред.

🔥 <b>Ҳама чиз омода аст!</b> Сигналҳои премиум акнун мустақиман ба ин чат меоянд. Барои савдои навбатии ғолибонаи худ омода шавед! 💸

Лаззат баред! 🎉`,
    partner_trial_expired: `⌛ <b>Давраи санҷишӣ ба анҷом расид</b>

Дастрасии ройгони шумо дар {expiryDate} ба охир расид. Акнун шумо аз даст медиҳед:
❌ Сигналҳои премиум Харидан/Фурӯхтан
❌ Огоҳиҳои бозор дар вақти воқеӣ
❌ Стратегияҳои эксклюзивии савдо

<b>Пулро дар миз нагузоред!</b> 📉

Барои фавран баргардонидани дастрасии пурра обунаи худро ҲОЗИР нав кунед! 👇`,
    partner_trial_status: `💎 <b>Дастрасии премиум фаъол аст</b>

Шумо барои фоида гирифтан аз сигналҳои эксклюзивии мо <b>{daysRemaining} рӯз</b> доред! 📈

Анҷом меёбад: {expiryDate}

Онҳоро истифода баред! 🚀`,
    partner_coming_soon: `🚧 <b>Ба наздикӣ</b>

Мо дар ин кор мекунем! Навсозиҳоро интизор шавед.`,
  },

  tl: {
    partner_trial_activated: `✅ <b>Tagumpay! Na-activate ang Trial</b>

Mayroon ka na ngayong <b>{daysRemaining} araw</b> ng buong access hanggang {expiryDate}.

🔥 <b>Handa ka na!</b> Ang mga premium signal ay direktang darating sa chat na ito. Maghanda para sa iyong susunod na panalo sa trade! 💸

Enjoy! 🎉`,
    partner_trial_expired: `⌛ <b>Nag-expire na ang Trial Period</b>

Natapos na ang iyong libreng access noong {expiryDate}. Nami-miss mo na ngayon ang:
❌ Premium Buy/Sell Signals
❌ Real-time Market Alerts
❌ Eksklusibong Trading Strategies

<b>Huwag iwanan ang pera sa mesa!</b> 📉

I-renew ang iyong subscription NGAYON para maibalik kaagad ang buong access! 👇`,
    partner_trial_status: `💎 <b>Aktibo ang Premium Access</b>

Mayroon kang <b>{daysRemaining} araw</b> na natitira para kumita mula sa aming eksklusibong signals! 📈

Mag-e-expire: {expiryDate}

Sulitin mo sila! 🚀`,
    partner_coming_soon: `🚧 <b>Malapit Na</b>

Ginagawa pa namin ito! Abangan.`,
  },
};
