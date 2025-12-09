/**
 * Channel Verification Internationalization
 *
 * Multi-language support for channel verification messages
 *
 * Key naming convention:
 * - partner_channel_prompt - Channel subscription prompt
 * - partner_verification_failed - Verification failure message
 */

import type { I18nMessages } from '@quantumdeal/framework';

/**
 * Channel i18n namespace identifier
 * Used when registering with LocalizationService
 */
export const CHANNEL_I18N_NAMESPACE = 'channel';

/**
 * Channel messages in format compatible with LocalizationService.registerI18n()
 */
export const channelMessages: I18nMessages = {
  en: {
    partner_channel_prompt: `🚀 <b>One Final Step to Profit!</b>

To activate your <b>Exclusive Free Trial</b>, you must join our partner channel first.

This is where the magic happens! 🌟
👉 {channelUrl}

<i>Join now to unlock the full potential of our trading signals.</i>

👇 <b>Click the button below once you've joined:</b>`,
    partner_verification_failed: `⚠️ <b>Verification Incomplete</b>

We couldn't verify your membership yet. Don't miss out on profitable opportunities! 💸

Please make sure you have joined <b>{channelName}</b>:
👉 {channelUrl}

<i>Once you join, try clicking the button again!</i>`,
  },

  ru: {
    partner_channel_prompt: `🚀 <b>Последний шаг к прибыли!</b>

Чтобы активировать <b>Эксклюзивный Бесплатный Пробный Период</b>, сначала подпишитесь на наш партнерский канал.

Здесь происходит вся магия! 🌟
👉 {channelUrl}

<i>Присоединяйтесь сейчас, чтобы раскрыть весь потенциал наших торговых сигналов.</i>

👇 <b>Нажмите кнопку ниже после подписки:</b>`,
    partner_verification_failed: `⚠️ <b>Проверка не завершена</b>

Мы пока не смогли подтвердить ваше членство. Не упустите прибыльные возможности! 💸

Пожалуйста, убедитесь, что вы подписались на <b>{channelName}</b>:
👉 {channelUrl}

<i>После подписки нажмите кнопку снова!</i>`,
  },

  uk: {
    partner_channel_prompt: `🚀 <b>Останній крок до прибутку!</b>

Щоб активувати <b>Ексклюзивний Безкоштовний Пробний Період</b>, спочатку підпишіться на наш партнерський канал.

Тут відбувається вся магія! 🌟
👉 {channelUrl}

<i>Приєднуйтесь зараз, щоб розкрити весь потенціал наших торгових сигналів.</i>

👇 <b>Натисніть кнопку нижче після підписки:</b>`,
    partner_verification_failed: `⚠️ <b>Перевірка не завершена</b>

Ми поки не змогли підтвердити ваше членство. Не пропустіть прибуткові можливості! 💸

Будь ласка, переконайтесь, що ви підписались на <b>{channelName}</b>:
👉 {channelUrl}

<i>Після підписки натисніть кнопку знову!</i>`,
  },

  hi: {
    partner_channel_prompt: `🚀 <b>लाभ के लिए अंतिम कदम!</b>

अपना <b>विशेष मुफ्त ट्रायल</b> सक्रिय करने के लिए, पहले हमारे पार्टनर चैनल से जुड़ें।

यहीं जादू होता है! 🌟
👉 {channelUrl}

<i>हमारे ट्रेडिंग सिग्नल की पूरी क्षमता को अनलॉक करने के लिए अभी जुड़ें।</i>

👇 <b>जुड़ने के बाद नीचे दिए गए बटन पर क्लिक करें:</b>`,
    partner_verification_failed: `⚠️ <b>सत्यापन अपूर्ण</b>

हम अभी तक आपकी सदस्यता सत्यापित नहीं कर सके। लाभदायक अवसरों को न चूकें! 💸

कृपया सुनिश्चित करें कि आपने <b>{channelName}</b> से जुड़े हैं:
👉 {channelUrl}

<i>जुड़ने के बाद, बटन पर फिर से क्लिक करें!</i>`,
  },

  fr: {
    partner_channel_prompt: `🚀 <b>Une dernière étape vers le profit!</b>

Pour activer votre <b>Essai Gratuit Exclusif</b>, vous devez d'abord rejoindre notre canal partenaire.

C'est là que la magie opère! 🌟
👉 {channelUrl}

<i>Rejoignez maintenant pour débloquer tout le potentiel de nos signaux de trading.</i>

👇 <b>Cliquez sur le bouton ci-dessous une fois que vous avez rejoint:</b>`,
    partner_verification_failed: `⚠️ <b>Vérification incomplète</b>

Nous n'avons pas encore pu vérifier votre adhésion. Ne manquez pas les opportunités rentables! 💸

Veuillez vous assurer d'avoir rejoint <b>{channelName}</b>:
👉 {channelUrl}

<i>Une fois rejoint, cliquez à nouveau sur le bouton!</i>`,
  },

  kk: {
    partner_channel_prompt: `🚀 <b>Табысқа соңғы қадам!</b>

<b>Эксклюзивті Тегін Сынақ Мерзімін</b> белсендіру үшін алдымен серіктес каналымызға жазылыңыз.

Сиқыр осы жерде болады! 🌟
👉 {channelUrl}

<i>Біздің сауда сигналдарының толық әлеуетін ашу үшін қазір қосылыңыз.</i>

👇 <b>Жазылғаннан кейін төмендегі батырманы басыңыз:</b>`,
    partner_verification_failed: `⚠️ <b>Тексеру аяқталмады</b>

Біз сіздің мүшелігіңізді әлі растай алмадық. Пайдалы мүмкіндіктерді жіберіп алмаңыз! 💸

<b>{channelName}</b> каналына жазылғаныңызға көз жеткізіңіз:
👉 {channelUrl}

<i>Жазылғаннан кейін батырманы қайта басыңыз!</i>`,
  },

  uz: {
    partner_channel_prompt: `🚀 <b>Foydaga oxirgi qadam!</b>

<b>Eksklyuziv Bepul Sinov Muddatini</b> faollashtirish uchun avval hamkor kanalimizga qo'shiling.

Sehr shu yerda sodir bo'ladi! 🌟
👉 {channelUrl}

<i>Savdo signallarimizning to'liq imkoniyatlarini ochish uchun hozir qo'shiling.</i>

👇 <b>Qo'shilganingizdan keyin quyidagi tugmani bosing:</b>`,
    partner_verification_failed: `⚠️ <b>Tasdiqlash tugallanmadi</b>

Biz hali sizning a'zoligingizni tasdiqlay olmadik. Foydali imkoniyatlarni o'tkazib yubormang! 💸

Iltimos, <b>{channelName}</b> kanaliga qo'shilganingizga ishonch hosil qiling:
👉 {channelUrl}

<i>Qo'shilganingizdan keyin tugmani qayta bosing!</i>`,
  },

  tg: {
    partner_channel_prompt: `🚀 <b>Қадами охирин ба фоида!</b>

Барои фаъолсозии <b>Давраи Санҷишии Ройгони Эксклюзивӣ</b>, аввал ба канали шарики мо ҳамроҳ шавед.

Сеҳр дар инҷо рӯй медиҳад! 🌟
👉 {channelUrl}

<i>Барои кушодани имконоти пурраи сигналҳои савдои мо ҳозир ҳамроҳ шавед.</i>

👇 <b>Пас аз ҳамроҳ шудан тугмаи зеринро пахш кунед:</b>`,
    partner_verification_failed: `⚠️ <b>Тасдиқ ба анҷом нарасид</b>

Мо ҳанӯз узвияти шуморо тасдиқ карда натавонистем. Имконоти фоидаовар аз даст надиҳед! 💸

Лутфан мутмаин шавед, ки ба <b>{channelName}</b> ҳамроҳ шудаед:
👉 {channelUrl}

<i>Пас аз ҳамроҳ шудан, тугмаро дубора пахш кунед!</i>`,
  },

  tl: {
    partner_channel_prompt: `🚀 <b>Isang Huling Hakbang para Kumita!</b>

Para ma-activate ang iyong <b>Eksklusibong Libreng Trial</b>, kailangan mo munang sumali sa aming partner channel.

Dito nangyayari ang magic! 🌟
👉 {channelUrl}

<i>Sumali ngayon para ma-unlock ang buong potensyal ng aming trading signals.</i>

👇 <b>I-click ang button sa ibaba kapag nakasali ka na:</b>`,
    partner_verification_failed: `⚠️ <b>Hindi Kumpleto ang Verification</b>

Hindi pa namin ma-verify ang iyong membership. Huwag palampasin ang mga pagkakataong kumita! 💸

Pakitiyak na sumali ka sa <b>{channelName}</b>:
👉 {channelUrl}

<i>Kapag nakasali ka na, subukang i-click ulit ang button!</i>`,
  },
};
