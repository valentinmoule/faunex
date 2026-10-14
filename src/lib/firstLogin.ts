// Première connexion : utilisé par DailyQuestPopup, etc.


const FIRST_LOGIN_KEY = 'faunex_first_login_done';

export const isFirstLogin = (userId: string) => {
  return !localStorage.getItem(`${FIRST_LOGIN_KEY}_${userId}`);
};

export const markFirstLoginDone = (userId: string) => {
  localStorage.setItem(`${FIRST_LOGIN_KEY}_${userId}`, '1');
};
