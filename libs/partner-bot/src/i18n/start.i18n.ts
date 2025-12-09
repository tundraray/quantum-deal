/**
 * Start/Welcome Scene Internationalization
 *
 * Multi-language support for welcome and start messages
 *
 * Key naming convention:
 * - partner_welcome - Main welcome message
 * - partner_welcome_lang - Language selection prompt after welcome
 */

import type { I18nMessages } from '@quantumdeal/framework';

/**
 * Start i18n namespace identifier
 * Used when registering with LocalizationService
 */
export const START_I18N_NAMESPACE = 'start';

/**
 * Start messages in format compatible with LocalizationService.registerI18n()
 */
export const startMessages: I18nMessages = {
  en: {
    partner_welcome: `👋 <b>Welcome to the Inner Circle!</b>

You are just one step away from unlocking our <b>Premium Trading Signals</b>. 🚀

Get ready to:
✅ Receive high-win-rate signals
✅ Access exclusive market insights
✅ Join a community of winners

<b>Activate your FREE trial now to start profiting!</b> 👇

To activate your <b>Exclusive Free Trial</b>, you must join our partner channel first.

This is where the magic happens! 🌟
👉 {channelUrl}

👇 <b>Click the button below once you've joined:</b>

Also, if you want to <b>change the language</b>, click this button 👇
/lang`,
    partner_welcome_lang: `

Also, if you want to <b>change the language</b>, click this button 👇`,
  },

  ru: {
    partner_welcome: `👋 <b>Добро пожаловать во Внутренний Круг!</b>

Вы в одном шаге от доступа к нашим <b>Премиум Торговым Сигналам</b>. 🚀

Приготовьтесь:
✅ Получать сигналы с высоким процентом успеха
✅ Иметь доступ к эксклюзивной аналитике рынка
✅ Присоединиться к сообществу успешных трейдеров

<b>Активируйте БЕСПЛАТНЫЙ пробный период прямо сейчас и начните зарабатывать!</b> 👇

Чтобы активировать <b>Эксклюзивный Бесплатный Пробный Период</b>, сначала подпишитесь на наш партнерский канал.

Здесь происходит вся магия! 🌟
👉 {channelUrl}

👇 <b>Нажмите кнопку ниже после подписки:</b>

Также, если вы хотите <b>изменить язык</b>, нажмите эту кнопку 👇
/lang`,
    partner_welcome_lang: `

Также, если вы хотите <b>изменить язык</b>, нажмите эту кнопку 👇`,
  },

  uk: {
    partner_welcome: `👋 <b>Ласкаво просимо до Внутрішнього Кола!</b>

Ви лише за один крок від доступу до наших <b>Преміум Торгових Сигналів</b>. 🚀

Приготуйтесь:
✅ Отримувати сигнали з високим відсотком успіху
✅ Мати доступ до ексклюзивної аналітики ринку
✅ Приєднатися до спільноти успішних трейдерів

<b>Активуйте БЕЗКОШТОВНИЙ пробний період прямо зараз і почніть заробляти!</b> 👇

Щоб активувати <b>Ексклюзивний Безкоштовний Пробний Період</b>, спочатку підпишіться на наш партнерський канал.

Тут відбувається вся магія! 🌟
👉 {channelUrl}

👇 <b>Натисніть кнопку нижче після підписки:</b>

Також, якщо ви хочете <b>змінити мову</b>, натисніть цю кнопку 👇
/lang`,
    partner_welcome_lang: `

Також, якщо ви хочете <b>змінити мову</b>, натисніть цю кнопку 👇`,
  },

  hi: {
    partner_welcome: `👋 <b>इनर सर्कल में आपका स्वागत है!</b>

आप हमारे <b>प्रीमियम ट्रेडिंग सिग्नल</b> को अनलॉक करने से बस एक कदम दूर हैं। 🚀

तैयार हो जाइए:
✅ उच्च जीत दर वाले सिग्नल प्राप्त करें
✅ विशेष बाजार अंतर्दृष्टि का उपयोग करें
✅ विजेताओं के समुदाय में शामिल हों

<b>अभी अपना मुफ्त ट्रायल सक्रिय करें और कमाई शुरू करें!</b> 👇

अपना <b>विशेष मुफ्त ट्रायल</b> सक्रिय करने के लिए, पहले हमारे पार्टनर चैनल से जुड़ें।

यहीं जादू होता है! 🌟
👉 {channelUrl}

👇 <b>जुड़ने के बाद नीचे दिए गए बटन पर क्लिक करें:</b>

साथ ही, अगर आप <b>भाषा बदलना</b> चाहते हैं, तो इस बटन पर क्लिक करें 👇
/lang`,
    partner_welcome_lang: `

साथ ही, अगर आप <b>भाषा बदलना</b> चाहते हैं, तो इस बटन पर क्लिक करें 👇`,
  },

  fr: {
    partner_welcome: `👋 <b>Bienvenue dans le Cercle Interieur!</b>

Vous etes a un pas de debloquer nos <b>Signaux de Trading Premium</b>. 🚀

Preparez-vous a:
✅ Recevoir des signaux a fort taux de reussite
✅ Acceder a des analyses de marche exclusives
✅ Rejoindre une communaute de gagnants

<b>Activez votre essai GRATUIT maintenant et commencez a profiter!</b> 👇

Pour activer votre <b>Essai Gratuit Exclusif</b>, vous devez d'abord rejoindre notre canal partenaire.

C'est la que la magie opere! 🌟
👉 {channelUrl}

👇 <b>Cliquez sur le bouton ci-dessous une fois que vous avez rejoint:</b>

De plus, si vous souhaitez <b>changer la langue</b>, cliquez sur ce bouton 👇
/lang`,
    partner_welcome_lang: `

De plus, si vous souhaitez <b>changer la langue</b>, cliquez sur ce bouton 👇`,
  },

  kk: {
    partner_welcome: `👋 <b>Ішкі шеңберге қош келдіңіз!</b>

Сіз біздің <b>Премиум Сауда Сигналдарына</b> қол жеткізуден бір қадам қалдыңыз. 🚀

Дайын болыңыз:
✅ Жоғары табыс көрсеткіші бар сигналдар алу
✅ Эксклюзивті нарық талдауына қол жеткізу
✅ Жеңімпаздар қауымдастығына қосылу

<b>Тегін сынақ мерзімін қазір белсендіріп, табыс таба бастаңыз!</b> 👇

<b>Эксклюзивті Тегін Сынақ Мерзімін</b> белсендіру үшін алдымен серіктес каналымызға жазылыңыз.

Сиқыр осы жерде болады! 🌟
👉 {channelUrl}

👇 <b>Жазылғаннан кейін төмендегі батырманы басыңыз:</b>

Сонымен қатар, <b>тілді өзгерткіңіз</b> келсе, осы батырманы басыңыз 👇
/lang`,
    partner_welcome_lang: `

Сонымен қатар, <b>тілді өзгерткіңіз</b> келсе, осы батырманы басыңыз 👇`,
  },

  uz: {
    partner_welcome: `👋 <b>Ichki doiraga xush kelibsiz!</b>

Siz bizning <b>Premium Savdo Signallarimizni</b> ochishdan bir qadam uzoqdasiz. 🚀

Tayyorgarlik ko'ring:
✅ Yuqori yutuv darajasiga ega signallarni qabul qilish
✅ Eksklyuziv bozor tahlillariga kirish
✅ G'oliblar jamoasiga qo'shilish

<b>Bepul sinov muddatini hozir faollashtiring va daromad olishni boshlang!</b> 👇

<b>Eksklyuziv Bepul Sinov Muddatini</b> faollashtirish uchun avval hamkor kanalimizga qo'shiling.

Sehr shu yerda sodir bo'ladi! 🌟
👉 {channelUrl}

👇 <b>Qo'shilganingizdan keyin quyidagi tugmani bosing:</b>

Shuningdek, agar <b>tilni o'zgartirmoqchi</b> bo'lsangiz, ushbu tugmani bosing 👇
/lang`,
    partner_welcome_lang: `

Shuningdek, agar <b>tilni o'zgartirmoqchi</b> bo'lsangiz, ushbu tugmani bosing 👇`,
  },

  tg: {
    partner_welcome: `👋 <b>Ба Доираи Дохили хуш омадед!</b>

Шумо танхо як қадам аз кушодани <b>Сигналхои Премиум Савдои</b> мо дур хастед. 🚀

Омода шавед:
✅ Сигналхои бо дарачаи баланди бурд гиред
✅ Ба тахлили эксклюзивии бозор дастрасӣ пайдо кунед
✅ Ба ҷамоати ғолибон ҳамроҳ шавед

<b>Давраи санҷишии ройгонро ҳозир фаъол созед ва даромад гирифтанро оғоз кунед!</b> 👇

Барои фаъолсозии <b>Давраи Санҷишии Ройгони Эксклюзивӣ</b>, аввал ба канали шарики мо ҳамроҳ шавед.

Сеҳр дар инҷо рӯй медиҳад! 🌟
👉 {channelUrl}

👇 <b>Пас аз ҳамроҳ шудан тугмаи зеринро пахш кунед:</b>

Инчунин, агар шумо хоҳед <b>забонро иваз кунед</b>, ин тугмаро пахш кунед 👇
/lang`,
    partner_welcome_lang: `

Инчунин, агар шумо хоҳед <b>забонро иваз кунед</b>, ин тугмаро пахш кунед 👇`,
  },

  tl: {
    partner_welcome: `👋 <b>Maligayang pagdating sa Inner Circle!</b>

Isang hakbang ka na lang para ma-unlock ang aming <b>Premium Trading Signals</b>. 🚀

Maghanda na:
✅ Tumanggap ng mga signal na may mataas na win-rate
✅ Ma-access ang eksklusibong market insights
✅ Sumali sa komunidad ng mga mananalo

<b>I-activate ang iyong LIBRENG trial ngayon para magsimulang kumita!</b> 👇

Para ma-activate ang iyong <b>Eksklusibong Libreng Trial</b>, kailangan mo munang sumali sa aming partner channel.

Dito nangyayari ang magic! 🌟
👉 {channelUrl}

👇 <b>I-click ang button sa ibaba kapag nakasali ka na:</b>

Gayundin, kung gusto mong <b>palitan ang wika</b>, i-click ang button na ito 👇
/lang`,
    partner_welcome_lang: `

Gayundin, kung gusto mong <b>palitan ang wika</b>, i-click ang button na ito 👇`,
  },
};
