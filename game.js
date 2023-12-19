var config = {
    type: Phaser.AUTO,
    mode: Phaser.Scale.RESIZE,
    parent: 'phaser-example',
    width: 1080,
    height: 1920,
    dom: {
        createContainer: true
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
     audio: {
        disableWebAudio: false // 웹 오디오 사용 여부 확인
    },
    fps: {
        target: 50,  // 원하는 FPS를 설정합니다.
        forceSetTimeOut: true
    }
};
// 스파게티 전문점에 오신걸 환영합니다. 
var back_start;
var back_game;

var joy_stick_out;
var joy_stick_in;
var joy_is;
var die_timer = 0;
var score_text;
var skill_gaze_text;
var aris_skill_is = false;
var aris_b_is = false;
var touch_left = false;
var touch_right = false;
var touch_m_left = false;
var touch_m_right = false;
var hit_timer = 0 ;
var game_tier_score = [0,0,0,0];
var weight_power = 0;
var leader_me_arr = ["나",1,1,1,1,1]; // 내 자신
var surround_arr = [["나",1,1,1,1,1],["너",1,1,1,1,1],["밤나무",1,1,1,1,1]]; // 주변 3인
var backButtonPressed = 0; // 뒤로가기 버튼 무효 처리 상태를 저장하는 변수
var test_nick;
var text_color_time  =0;
var finish_nick_is = false;
 window.addEventListener('popstate', function (event) {
        backButtonPressed++;
        
        if (backButtonPressed === 1) {
            // 첫 번째 뒤로가기 버튼 눌림
            // 사용자에게 경고 메시지 표시
            alert('뒤로가려면 한 번 더 눌러주세요.');
            
            // 2초 후에 버튼 누름 횟수 초기화
            setTimeout(function () {
                backButtonPressed = 0;
            }, 2000);
        } else if (backButtonPressed === 2) {
            // 두 번째 뒤로가기 버튼 눌림
            // 뒤로가기 동작 실행
            history.back();
        }
    });

// Firebase Anonymous Auth
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in.
        const uid = user.uid;
        await new Leaderboard().setCookie("firebaseUID", uid);
    } else {
        // User is signed out. Sign them in anonymously.
        firebase.auth().signInAnonymously().catch((error) => {
            console.error("Error signing in:", error);
        });
    }
});

class Leaderboard {
    constructor() {
        this.board = [];
    }

    // Set a cookie
    setCookie(name, value) {
        document.cookie = `${name}=${value};path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT`;
    }

    // Get a cookie by name
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    async fetchCurrentUserAndRank() {
        const uid = this.getCookie("firebaseUID");
        if (!uid) {
            console.error("User not authenticated!");
            return null;
        }
    
        // Fetch the current user data
        let currentUserData = null;
        const userRef = firebase.database().ref(`scores/${uid}`);
        await userRef.once('value', (snapshot) => {
            currentUserData = snapshot.val();
        });
    
        if (!currentUserData) {
            console.error("No existing data found for the user");
            return null;
        }
    
        // Fetch the leaderboard to calculate the user's rank
        const leaderboard = await this.getScore();
        let rank = -1;
        for (let i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i][3] === currentUserData.score) {
                rank = i + 1;  // Rankings start from 1, not 0
                break;
            }
        }
        
        // 동점자 처리
        while (rank > 1 && leaderboard[rank - 2][3] === currentUserData.score) {
            rank--;
        }
    
        // Add the rank to the current user data
        currentUserData.rank = rank;
    
        // Update the user data array
        const leader_me_arr = [
            currentUserData.nickname,
            currentUserData.level,
            currentUserData.character,
            currentUserData.score,
            currentUserData.rank,
            currentUserData.rank
        ];

    
        return leader_me_arr;
    }
    

    async getScore() {
        const scoresRef = firebase.database().ref('scores').limitToFirst(120);
        let sortedBoard = [];
    
        await scoresRef.once('value', (snapshot) => {
            const data = snapshot.val();
            for (let uid in data) {
                const playerData = data[uid];
                // 각 플레이어의 데이터를 get_reader 형식에 맞게 배열로 변환
                const playerArray = [
                    playerData.nickname, // "닉네임"
                    playerData.level, // "레벨"
                    playerData.character, // "사용캐릭"
                    playerData.score, // "점수"
                    playerData.rank // "순위"
                ];
                sortedBoard.push(playerArray);
            }
    
            const hasValidScore = (data) => {
                return typeof data[3] !== 'undefined' && data[3] !== null; // data[3]는 점수를 나타냅니다.
            };
        
            sortedBoard = sortedBoard.filter(hasValidScore);
        
            // 점수를 기준으로 정렬하되, 동점일 경우 닉네임을 기준으로 정렬
            sortedBoard.sort((a, b) => {
                if (b[3] === a[3]) {
                    return a[0].localeCompare(b[0]);  // 닉네임을 기준으로 정렬
                }
                return b[3] - a[3];
            });
        });
        return sortedBoard;
    }   
    
    async addScore(newScore, options = {}) {
        const uid = this.getCookie("firebaseUID");
        if (!uid) {
            console.error("User not authenticated!");
            return;
        }
    
        // Fetch existing data for the user
        let existingData = null;
        const userRef = firebase.database().ref(`scores/${uid}`);
        await userRef.once('value', (snapshot) => {
            existingData = snapshot.val();
        });
    
        // If no existing data, create a new entry
        if (!existingData) {
            console.log("No existing data found. Creating a new entry.");
            existingData = {
                nickname: options.nickname || "NewUser",
                level: options.level || 1,
                character: options.character || "DefaultCharacter",
                score: newScore || 0, // Default to 0 if newScore is undefined
                rank: options.rank || 0
            };            
        } else {
            // Check if the new score is higher than the existing score
            if (existingData.score >= newScore) {
                console.log("Existing score is higher or equal. No update needed.");
                return;
            }
    
            // Update the fields and keep other fields the same
            existingData.score = newScore;
            if (options.nickname) existingData.nickname = options.nickname;
            if (options.character) existingData.character = options.character;
            if (options.level) existingData.level = options.level;
            if (options.rank) existingData.rank = options.rank;
        }
    
        // Update the leaderboard in-memory
        const index = this.board.findIndex(user => user.uid === uid);
        if (index !== -1) {
            this.board[index] = existingData;
        } else {
            this.board.push(existingData);
        }
    
        // Update the leaderboard in Firebase
        await userRef.set(existingData);
    
        console.log("Score and other data updated successfully.");
    }    
    
    
    async getcurruserranking(uid) { //현재 유저 랭킹
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i].uid === uid) {
                return i + 1; // Rankings start from 1, not 0
            }
        }

        return -1; // User not found in the rankings
    }

    // Check if the nickname is already taken
    async isNicknameTaken(nickname, uid) {
        const scoresRef = firebase.database().ref('scores');
        let isTaken = false;

        await scoresRef.once('value', (snapshot) => {
            const data = snapshot.val();
            for (let userId in data) {
                if (data[userId].nickname === nickname && userId !== uid) {
                    isTaken = true;
                    break;
                }
            }
        });

        return isTaken;
    }

    async getSurroundingRanks() {
        const leaderboard = await this.getScore(); // Fetch the leaderboard
        const uid = this.getCookie("firebaseUID"); // Fetch the current user's Firebase UID
    
        if (!uid) {
            console.error("User not authenticated!");
            return null;
        }
    
        const currentUserData = await this.fetchCurrentUserAndRank(); // Fetch the current user's data including rank
    
        if (!currentUserData) {
            console.error("No existing data found for the user");
            return null;
        }
    
        let rank = currentUserData[4]; // Get the rank from the current user's data (5th element in array)
    
        if (rank === -1) {
            console.error("User not found in leaderboard");
            return null;
        }
    
        let surround_arr = [];
    
        const hasValidScore = (data) => {
            return typeof data[3] !== 'undefined' && data[3] !== null; // data[3]는 점수를 나타냅니다.
        };
    
        const addWithRank = (data, rank) => {
            if (data && hasValidScore(data)) {
                let newData = [...data]; // Clone the array to avoid modifying the original
                newData[5] = rank; // Set the rank (5th element)
                return newData;
            }
            return null;
        };
    
        if (rank === 1) { // If the user is the first one
            surround_arr.push(addWithRank(currentUserData, 1));
            surround_arr.push(addWithRank(leaderboard[1], 2));
            surround_arr.push(addWithRank(leaderboard[2], 3));
        } else if (rank === leaderboard.length) { // If the user is the last one
            surround_arr.push(addWithRank(leaderboard[leaderboard.length - 3], leaderboard.length - 2));
            surround_arr.push(addWithRank(leaderboard[leaderboard.length - 2], leaderboard.length - 1));
            surround_arr.push(addWithRank(currentUserData, leaderboard.length));
        } else {
            surround_arr.push(addWithRank(leaderboard[rank - 2], rank - 1));
            surround_arr.push(addWithRank(currentUserData, rank));
            surround_arr.push(addWithRank(leaderboard[rank], rank + 1));
        }
    
        return surround_arr.filter(entry => entry !== null);
    }

    async getSurroundingRanksWithScore(game_score) {
        const leaderboard = await this.getScore(); // Fetch the leaderboard
        const uid = this.getCookie("firebaseUID"); // Fetch the current user's Firebase UID
    
        if (!uid) {
            console.error("User not authenticated!");
            return null;
        }
    
        // Get current user's highest score
        const currentUserHighestScoreData = await this.fetchCurrentUserAndRank();
    
        if (!currentUserHighestScoreData) {
            console.error("No existing data found for the user");
            return null;
        }
    
        const currentUserHighestScore = currentUserHighestScoreData[3];
    
        // If the game score is the user's highest score, use getSurroundingRanks
        if (game_score >= currentUserHighestScore) {
            return await this.getSurroundingRanks();
        }
    
        // Else, continue with the original logic
        // Find the rank of the user based on the game_score
        let rank = -1;
        for (let i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i][3] <= game_score) { 
                rank = i + 1;
                break;
            }
        }
    
        // If the game score is the lowest
        if (rank === -1) {
            rank = leaderboard.length + 1;
        }
    
        // Get current user's basic data (excluding the score)
        const currentUserBasicData = currentUserHighestScoreData.slice();
        // Replace the score with the recent game score
        currentUserBasicData[3] = game_score;
        currentUserBasicData[5] = rank; // Update the rank too
    
        // Insert the current user's data into the leaderboard at the appropriate position
        leaderboard.splice(rank - 1, 0, currentUserBasicData);
    
        let surround_arr = [];
    
        const hasValidScore = (data) => {
            return typeof data[3] !== 'undefined' && data[3] !== null; // data[3] represents the score
        };
    
        const addWithRank = (data, rank) => {
            if (data && hasValidScore(data)) {
                let newData = [...data]; // Clone the array to avoid modifying the original
                newData[5] = rank; // Set the rank (6th element)
                return newData;
            }
            return null;
        };
    
        if (rank === 1) { // If the user is the first one
            surround_arr.push(addWithRank(leaderboard[0], 1));
            surround_arr.push(addWithRank(leaderboard[1], 2));
            surround_arr.push(addWithRank(leaderboard[2], 3));
        } else if (rank === leaderboard.length) { // If the user is the last one
            surround_arr.push(addWithRank(leaderboard[leaderboard.length - 3], leaderboard.length - 2));
            surround_arr.push(addWithRank(leaderboard[leaderboard.length - 2], leaderboard.length - 1));
            surround_arr.push(addWithRank(leaderboard[leaderboard.length - 1], leaderboard.length));
        } else {
            surround_arr.push(addWithRank(leaderboard[rank - 2], rank - 1));
            surround_arr.push(addWithRank(leaderboard[rank - 1], rank));
            surround_arr.push(addWithRank(leaderboard[rank], rank + 1));
        }
    
        return surround_arr.filter(entry => entry !== null);
    }       

    // Fetch the current user's nickname from Firebase
    async fetchNickname(uid) {
        const ref = firebase.database().ref(`scores/${uid}/nickname`);
        let nickname = null;

        await ref.once('value', (snapshot) => {
            nickname = snapshot.val();
        });

        return nickname;
    }

    async checkDuplicateNickname(nickname) { //닉넹임 중복 확인: 있으면 true, 없으면 false
        const scoresRef = firebase.database().ref('scores');
        let isDuplicate = false;
    
        await scoresRef.once('value', (snapshot) => {
            const data = snapshot.val();
            for (let uid in data) {
                const playerData = data[uid];
                if (playerData.nickname === nickname) {
                    isDuplicate = true;
                    break;
                }
            }
        });
    
        return isDuplicate;
    }
}

var get_reader = [];

async function fetchScores() {
    const leaderboard = new Leaderboard(); // 인스턴스 생성
    const result = await leaderboard.getScore(); // 인스턴스를 통해 getScore 호출
    const uid = leaderboard.getCookie("firebaseUID");
    if (uid) {
        leaderboard.setCookie("firebaseUID", uid);
        nick_input_text_box.text = await leaderboard.fetchNickname(uid);
    } else {
        // 쿠키 정보가 없을 때 처리할 로직을 여기에 추가하면 됩니다.
        console.error("UID 쿠키가 없습니다.");
    }
    await leaderboard.fetchCurrentUserAndRank().then(fetchedData => {
        if (fetchedData) {
            // Populate the leader_me_arr with the fetched data
            for (let i = 0; i < fetchedData.length; i++) {
                leader_me_arr[i] = fetchedData[i];
            }
            console.log("leader_me_arr updated:", leader_me_arr);
        }
    });
    get_reader = result;
}


let isScoresFetched = false; // 데이터가 불러와졌는지를 판별하는 플래그

async function fetchScoresAndSetFlag() {
    await fetchScores();
    isScoresFetched = true; // 데이터가 불러와진 상태를 표시
}

var monster ={
    num : 0,
    mx : 1 ,
    my : 1,
};
var arrow;
var play_level ={
    monster_respawn : 2,
    monster_extra_respawn : 2,
    monster_speed : 20,
    monster_extra_speed : 5,
    heal_respawn : 60,
    weapon_respawn : 40,
    score_respawn : 30,
    bomb_respawn : 20,
    random_bomb_max : -10,
    random_bomb_min : -30,

    per_sec_score :2,
    random_socre_min : 0,
    random_socre_max : 50,
    game_max_health :3,
};

var play_level_1 ={
    monster_respawn : 4,
    monster_extra_respawn : 2,
    monster_speed : 25,
    monster_extra_speed : 15,
    heal_respawn : 100,
    weapon_respawn : 100,
    per_sec_score :1,
    score_respawn : 40,
    bomb_respawn : 50,
    random_bomb_max : 0,
    random_bomb_min : -10,
    random_socre_min : 0,
    random_socre_max : 10,
    game_max_health :3,
};

var play_level_2 ={
    monster_respawn : 3,
    monster_extra_respawn : 1.5,
    monster_speed : 40,
    monster_extra_speed : 10,
    heal_respawn : 150,
    weapon_respawn : 150,
    score_respawn : 30,
    per_sec_score :3,
    random_socre_min : 0,
    random_socre_max : 30,
    game_max_health :3,
    bomb_respawn : 40,
    random_bomb_max : -0,
    random_bomb_min : -30,
    
};

var play_level_3 ={
    monster_respawn : 1.5,
    monster_extra_respawn : 0.5,
    monster_speed : 50,
    monster_extra_speed : 10,
    heal_respawn : 200,
    weapon_respawn : 200,
    score_respawn : 20,
    per_sec_score :10,
    random_socre_min : 0,
    random_socre_max : 100,
    game_max_health :3,
    bomb_respawn : 30,
    random_bomb_max : 0,
    random_bomb_min : -100,
    
};
var play_character = {
    cx : 540,
    cy : 1700,
    speed : 18,
    skill_gaze : 100,
    vector : 1,
}
var semi_socre = 0;
var motion_timer;
var bgm_1;
var bgm_2;
var close_m;
var get_item_m;
var touch_m;
var expolosion_m;
var warning_m;
var choice_m_0;
var choice_m_1;
var choice_m_2;
var choice_m_3;
var choice_m_4;
var choice_m_5;
var skill_m_0;
var skill_m_1;
var skill_m_2;
var skill_m_3;
var skill_m_4;
var skill_m_5;
var impact_m_0;
var impact_m_1;
var impact_m_2;
var impact_m_3;
var impact_m_4;
var impact_m_5;
var end_w;

var hit_m;

var skill_button;
var aris_power =0;
var back_button;
var back_button2;
var monster_timer = 0;
var game_type = "start"; // 게임 스테이지를 설정합니다.
var timer = 0 ;
var ingame_type ="first"; // 인게임 타입
var game_type_arr = []; // 게임타입 
var bg_image;
var close_button; // 닫기버튼
var game_bg_sound = 50; // 배경음
var game_ip_sound = 50; // 효과음
var game_score = 0;
var nick_test_is = false; // 닉네임 중복확인

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@----시작화면
var start_button; // 시작버튼
var start_dog; // 멍멍이
var start_readerbord; // 리더보드 버튼
var start_youtube; // 유튜브 버튼
var start_setting; // 설정 버튼
var start_imformation; // 정보 버튼
var start_imformation_box; // 정보창 버튼
var start_imformation_youtube; // 정보창 버튼
var namef;
var start_setting_box; // 환경설정창
var start_setting_togle1; // 환경설정 토글1
var start_setting_togle2; // 환경설정 토글2
var start_setting_youtube; // 환경설정 유튜브
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@ --- 환경설정
var togle1_drag = false;
var togle2_drag = false;
var togle_min_x = 415;
var togle_max_x = 900;
var before_point_x; //원래 마우스 좌표

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@ --- 리더보드
var reader_outbox;
var reader_left_button;
var reader_right_button;
var reader_player_box = [];

var get_reader = [];

var reader_character_image = [];
var reader_tier_image = [];
var reader_name_text = [];
var reader_score_text = [];
var reader_rank_text = [];
var reader_level_image = [];
var reader_bg_image = [];
var reader_page_num = 0;
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-----닉네임 설정
var nick_input_outbox; // 닉네임 입력 큰 박스
var nick_input_inbox; // 닉네임 입력 안쪽 박스
var nick_input_text_box; // 닉네임 입력 박스
var nick_finish_text_box; // 닉네임 입력 박스
var nick_input_text; // 닉네임 입력 텍스트 박스
var nick_finish_button; // 닉네임 완료 버튼
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@---캐릭터 선택

var character_choice_box; // 캐릭터 선택창  
var character_choice_num=0; // 캐릭터를 선택한 번호 
var character_image = []; // 캐릭터 이미지
var character_vector = [[240,800],[540,800],[840,800],[240,1150],[540,1150],[840,1150]]; // 캐릭터 이미지
var character_finish_button; // 캐릭터 선택 버튼

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@난이도 설정
var level_button = [,,]; // 3개 
var level_type = "null"; //  sasasa

//@@@@@@@@@@@@@@@@@@@@@@@@@@@인 게임 화면
var game_bg1;
var game_bg3;
var game_bg4;
var game_bg2;
var game_tier_image;
var game_score_text; // 게임 점수 텍스트
var game_score_box; // 게임 점수 박스
var game_score_image; // 게임 점수 이미지
var game_level_image; // 게임 난이도 나타낼 텍스트
var game_unit; //플레이어블 캐릭
var game_health; // 게임 체력
var game_health_image = []; //게임 체력 이미지max 3 , min 0;
var game_menu_button; // 게임 메뉴 버튼

var menu_box;
var menu_giveup;
var menu_replay;
var menu_setting;
var menu_score_text;
var game_health_point = 3;
//_______________________// 스킬
var skill_cooltime;
var skill_image; // 명패
var skill_impact; //이펙트
var skill_type; //스킬 종류
var skill_gaze; // 게이지
var skill_able =false;
var skill_is = false;
var skill_speed = [15,15,15,15,15,15];
var skill_timer;
var skill_count;
var skill_izuna_impact = []; // x y 이미지
var skill_izuna_image = []; // x y 이미지

var skill_nonomi_impact =[];
var skill_nonomi_image =[];


var skill_hina_impact =[];
var skill_hina_image =[];
var nonomi_angle = [30,22,15,7,0,-8,-15,-22,-30,-22,-15,-7,0,7,15,22];
//_______________________//game_system
var game_monster_arr = []; //몬스터 객체
var game_monster_image = []; //몬스터 이미지
var game_heal_image = []; // 체력 이미지
var game_drop_heart; // 드랍 하트
var game_drop_heart_is =false; // 드랍 하트


var game_drop_score; // 드랍 점수
var game_drop_score_is =false; // 드랍 점수


var game_drop_timer = [,,,,];
var game_drop_weapon; // 드랍 무기
var game_drop_weapon_is =false; // 드랍 무기


var game_drop_bomb; // 드랍 폭탄
var game_drop_bomb_is =false; // 드랍 폭탄
var bomb_drt = 1;
var warning_image ;

var break_impact = []; //
var break_impact_arr = [];


var player_unit; // 플레이어 유닛

//@@@@@@@@@@@@@@@@@@@@@@@//게임 결과 
var end_outbox;
var end_readerbord =[]; // 3개
var end_replay_button; //다시하기 버튼
var end_share_button; //공유하기 버튼
var end_tier_image;
var end_score_text;

var animation_sec = []; // 애니메이션 진행 시간
var animation_bool= []; // 애니메이션이 역행인지 판단
var point_down_button = []; // 눌렀던 버튼들 정보
var point_down_button_isclick= []; //버튼을 클릭했는가?
var use_button = []; // 사용할 버튼
var loading_image;
var game = new Phaser.Game(config);
function preload() { // 첫번째로 실행됨 -  주로 데이터 로딩

        var url;
        url = 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbbcodetextplugin.min.js';
        this.load.plugin('rexbbcodetextplugin', url, true);
      
        url = 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rextexteditplugin.min.js';
        this.load.plugin('rextexteditplugin', url, true);
    
        this.load.audio('bgm_m1', './6. 배경음/배경음1.mp3');
        this.load.audio('bgm_m2', './6. 배경음/배경음2.mp3');

        this.load.audio('hit_m', './7. 효과음/피격음.mp3');
        this.load.audio('choice_m0', './7. 효과음/선택_노노미.mp3');
        this.load.audio('choice_m1', './7. 효과음/선택_유우카.mp3');
        this.load.audio('choice_m2', './7. 효과음/선택_츠루기.mp3');
        this.load.audio('choice_m3', './7. 효과음/선택_아리스.mp3');
        this.load.audio('choice_m4', './7. 효과음/선택_이즈나.mp3');
        this.load.audio('choice_m5', './7. 효과음/선택_히나.mp3');

         this.load.audio('warning_m1', './7. 효과음/워닝음.mp3');

        this.load.audio('skill_m0', './7. 효과음/노노미_보이스.mp3');
        this.load.audio('skill_m1', './7. 효과음/유우카_보이스.mp3');
        this.load.audio('skill_m2', './7. 효과음/츠루기_보이스.mp3');
        this.load.audio('skill_m3', './7. 효과음/아리스_보이스.mp3');
        this.load.audio('skill_m4', './7. 효과음/이즈나_보이스.mp3');
        this.load.audio('skill_m5', './7. 효과음/히나_보이스.mp3');


        this.load.audio('impact_m0', './7. 효과음/노노미_효과음.mp3');
        this.load.audio('impact_m1', './7. 효과음/유우카_효과음.mp3');
        this.load.audio('impact_m2', './7. 효과음/츠루기_효과음.mp3');
        this.load.audio('impact_m3', './7. 효과음/아리스_효과음.mp3');
        this.load.audio('impact_m4', './7. 효과음/이즈나_효과음.mp3');
        this.load.audio('impact_m5', './7. 효과음/히나_효과음.mp3');


        this.load.audio('touchm', './7. 효과음/터치음.mp3');
        this.load.audio('get_itemm', './7. 효과음/습득음.mp3');
        this.load.audio('closem', './7. 효과음/닫기음.mp3');


        this.load.audio('end_music_w', './7. 효과음/게임결과음.wav');

        this.load.audio('expolosionm', './7. 효과음/폭발음.mp3');


    // BG 

    this.load.image('back_button_i', './1. 메인화면/뒤로가기 버튼.png');


    this.load.image('start_bg', './1. 메인화면/배경이미지.png');
    this.load.image('nick_bg', './2. 게임화면/선택이미지.png');
    this.load.image('game_bg', './2. 게임화면/배경이미지.png');


    this.load.image('joy_out_img', './2. 게임화면/바깥 원.png');
    this.load.image('joy_in_img', './2. 게임화면/안쪽 원.png');

    this.load.image('back_image', './1. 메인화면/background_b.png');
    this.load.image('game_bg1', './2. 게임화면/배경1.png');
    this.load.image('game_bg2', './2. 게임화면/배경2.png');

    this.load.image('game_end_box_ui', './4. 게임결과/게임결과창.png');
    this.load.image('game_replay_button_ui', './4. 게임결과/게임 다시하기 버튼.png');
    this.load.image('game_share_button_ui', './4. 게임결과/점수 공유하기 버튼.png');
    
    this.load.image('start_dog_ui', './1. 메인화면/피하기 로고.png');
    this.load.image('start_button_ui', './1. 메인화면/게임시작 버튼.png');
    this.load.image('start_readerbord_ui', './1. 메인화면/리더보드 버튼.png');
    this.load.image('start_setting_ui', './1. 메인화면/환경설정 버튼.png');
    this.load.image('start_youtube_ui', './1. 메인화면/유튜브 버튼.png');
    this.load.image('start_imformation_ui', './1. 메인화면/정보 버튼.png');

    this.load.image('reader_left_ui', './1. 메인화면/화살표1.png');
    this.load.image('reader_right_ui', './1. 메인화면/화살표2.png');

    this.load.image('close_ui', './1. 메인화면/닫기버튼.png');
    this.load.image('start_togle_ui', './1. 메인화면/음량조절 토글.png');

    this.load.image('menu_box_ui', './2. 게임화면/메뉴창.png');
    this.load.image('menu_giveup_ui', './3. 메뉴창/포기하기 버튼.png');
    this.load.image('menu_setting_ui', './3. 메뉴창/환경설정 버튼.png');
    this.load.image('menu_replay_ui', './3. 메뉴창/재시작 버튼.png');


    this.load.image('nick_finish1_button_ui', './2. 게임화면/중복확인 버튼.png');
    this.load.image('nick_finish2_button_ui', './2. 게임화면/결정 버튼.png');
    this.load.image('character_finish_button_ui', './2. 게임화면/선택완료 버튼.png');
    this.load.image('game_menu_button_ui',     './2. 게임화면/메뉴버튼.png');

    this.load.image('game_level_normal',     './2. 게임화면/난이도4.png');
    this.load.image('game_level_hardcore',     './2. 게임화면/난이도5.png');
    this.load.image('game_level_insane',     './2. 게임화면/난이도6.png');

    this.load.image('game_tier_1',     './2. 게임화면/티어1.png');
    this.load.image('game_tier_2',     './2. 게임화면/티어2.png');
    this.load.image('game_tier_3',     './2. 게임화면/티어3.png');
    this.load.image('game_tier_4',     './2. 게임화면/티어4.png');

    this.load.image('play_ball_1',     './10. 캐릭터 이미지/노노미볼1.png');
    this.load.image('play_ball_2',     './10. 캐릭터 이미지/유우카볼1.png');
    this.load.image('play_ball_3',     './10. 캐릭터 이미지/츠루기볼1.png');
    this.load.image('play_ball_4',     './10. 캐릭터 이미지/아리스볼1.png');
    this.load.image('play_ball_5',     './10. 캐릭터 이미지/이즈나볼1.png');
    this.load.image('play_ball_6',     './10. 캐릭터 이미지/히나볼1.png');

    this.load.image('play_ball_1h',     './10. 캐릭터 이미지/노노미볼2.png');
    this.load.image('play_ball_2h',     './10. 캐릭터 이미지/유우카볼2.png');
    this.load.image('play_ball_3h',     './10. 캐릭터 이미지/츠루기볼2.png');
    this.load.image('play_ball_4h',     './10. 캐릭터 이미지/아리스볼2.png');
    this.load.image('play_ball_5h',     './10. 캐릭터 이미지/이즈나볼2.png');
    this.load.image('play_ball_6h',     './10. 캐릭터 이미지/히나볼2.png');

    this.load.image('skill_button_1',     './8. 스킬 관련/노노미_버튼.png');
    this.load.image('skill_button_2',     './8. 스킬 관련/유우카_버튼.png');
    this.load.image('skill_button_3',     './8. 스킬 관련/츠루기_버튼.png');
    this.load.image('skill_button_4',     './8. 스킬 관련/아리스_버튼.png');
    this.load.image('skill_button_5',     './8. 스킬 관련/이즈나_버튼.png');
    this.load.image('skill_button_6',     './8. 스킬 관련/히나_버튼.png');
    
    this.load.image('skill_image_0',     './8. 스킬 관련/노노미_명패.png');
    this.load.image('skill_image_1',     './8. 스킬 관련/유우카_명패.png');
    this.load.image('skill_image_2',     './8. 스킬 관련/츠루기_명패.png');
    this.load.image('skill_image_3',     './8. 스킬 관련/아리스_명패.png');
    this.load.image('skill_image_4',     './8. 스킬 관련/이즈나_명패.png');
    this.load.image('skill_image_5',     './8. 스킬 관련/히나_명패.png');

    this.load.image('reader_c1',     './5. 리더보드/리더보드_노노미.png');
    this.load.image('reader_c2',     './5. 리더보드/리더보드_유우카.png');
    this.load.image('reader_c3',     './5. 리더보드/리더보드_츠루기.png');
    this.load.image('reader_c4',     './5. 리더보드/리더보드_아리스.png');
    this.load.image('reader_c5',     './5. 리더보드/리더보드_이즈나.png');
    this.load.image('reader_c6',     './5. 리더보드/리더보드_히나.png');


    this.load.image('reader_bg',     './5. 리더보드/리더보드_배경.png');
    this.load.image('reader_l1',     './5. 리더보드/난이도1.png');
    this.load.image('reader_l2',     './5. 리더보드/난이도2.png');
    this.load.image('reader_l3',     './5. 리더보드/난이도3.png');

    this.load.image('reader_t1',     './5. 리더보드/티어1.png');
    this.load.image('reader_t2',     './5. 리더보드/티어2.png');
    this.load.image('reader_t3',     './5. 리더보드/티어3.png');
    this.load.image('reader_t4',     './5. 리더보드/티어4.png');

    this.load.image('random_score',     './2. 게임화면/randombox.png');
    this.load.image('skill_weapon_1',     './2. 게임화면/노노미_무기.png');
    this.load.image('skill_weapon_2',     './2. 게임화면/유우카_무기.png');
    this.load.image('skill_weapon_3',     './2. 게임화면/츠루기_무기.png');
    this.load.image('skill_weapon_4',     './2. 게임화면/아리스_무기.png');
    this.load.image('skill_weapon_5',     './2. 게임화면/이즈나_무기.png');
    this.load.image('skill_weapon_6',     './2. 게임화면/히나_무기.png');

    this.load.image('skill_gaze_ui',     './2. 게임화면/스킬바.png');


    this.load.image('skill_nonomi',     './8. 스킬 관련/노노미_이펙트.png');

    this.load.image('skill_hina',     './8. 스킬 관련/히나_이펙트.png');
    this.load.image('skill_yuuka',     './8. 스킬 관련/유우카_이펙트.png');

    this.load.image('skill_aris',     './8. 스킬 관련/아리스_이펙트.png');
    this.load.image('skill_churugi',     './8. 스킬 관련/츠루기_이펙트.png');

    this.load.image('izuna_1',     './11. 이즈나 이펙트/izuna00.png');
    this.load.image('izuna_2',     './11. 이즈나 이펙트/izuna01.png');
    this.load.image('izuna_3',     './11. 이즈나 이펙트/izuna02.png');
    this.load.image('izuna_4',     './11. 이즈나 이펙트/izuna03.png');
    this.load.image('izuna_5',     './11. 이즈나 이펙트/izuna04.png');
    this.load.image('izuna_6',     './11. 이즈나 이펙트/izuna05.png');
    this.load.image('izuna_7',     './11. 이즈나 이펙트/izuna06.png');
    this.load.image('izuna_8',     './11. 이즈나 이펙트/izuna07.png');
    this.load.image('izuna_9',     './11. 이즈나 이펙트/izuna08.png');
    this.load.image('izuna_10',     './11. 이즈나 이펙트/izuna09.png');

    this.load.image('izuna_11',     './11. 이즈나 이펙트/izuna10.png');
    this.load.image('izuna_12',     './11. 이즈나 이펙트/izuna11.png');
    this.load.image('izuna_13',     './11. 이즈나 이펙트/izuna12.png');
    this.load.image('izuna_14',     './11. 이즈나 이펙트/izuna13.png');
    this.load.image('izuna_15',     './11. 이즈나 이펙트/izuna14.png');
    this.load.image('izuna_16',     './11. 이즈나 이펙트/izuna15.png');
    this.load.image('izuna_17',     './11. 이즈나 이펙트/izuna16.png');
    this.load.image('izuna_18',     './11. 이즈나 이펙트/izuna17.png');



    this.load.image('explosion_4',     './9. 폭발 이펙트/explosion04.png');
    this.load.image('explosion_5',     './9. 폭발 이펙트/explosion05.png');  
    this.load.image('explosion_6',     './9. 폭발 이펙트/explosion06.png');
    this.load.image('explosion_7',     './9. 폭발 이펙트/explosion07.png');  
    this.load.image('explosion_8',     './9. 폭발 이펙트/explosion08.png');
    this.load.image('explosion_9',     './9. 폭발 이펙트/explosion09.png');  
    this.load.image('explosion_10',     './9. 폭발 이펙트/explosion10.png');


    this.load.image('explosion_11',     './9. 폭발 이펙트/explosion11.png');  
    this.load.image('explosion_12',     './9. 폭발 이펙트/explosion12.png');
    this.load.image('explosion_13',     './9. 폭발 이펙트/explosion13.png');  
    this.load.image('explosion_14',     './9. 폭발 이펙트/explosion14.png');
    this.load.image('explosion_15',     './9. 폭발 이펙트/explosion15.png');  
    this.load.image('explosion_16',     './9. 폭발 이펙트/explosion16.png');
    this.load.image('explosion_17',     './9. 폭발 이펙트/explosion17.png');  
    this.load.image('explosion_18',     './9. 폭발 이펙트/explosion18.png');
    this.load.image('explosion_19',     './9. 폭발 이펙트/explosion19.png');  
    this.load.image('explosion_20',     './9. 폭발 이펙트/explosion20.png');

    this.load.image('explosion_21',     './9. 폭발 이펙트/explosion21.png');  
    this.load.image('explosion_22',     './9. 폭발 이펙트/explosion22.png');
    this.load.image('explosion_23',     './9. 폭발 이펙트/explosion23.png');  
    this.load.image('explosion_24',     './9. 폭발 이펙트/explosion24.png');
    this.load.image('explosion_25',     './9. 폭발 이펙트/explosion25.png');  
    this.load.image('explosion_26',     './9. 폭발 이펙트/explosion26.png');
    this.load.image('explosion_27',     './9. 폭발 이펙트/explosion27.png');  
    this.load.image('explosion_28',     './9. 폭발 이펙트/explosion28.png');
    this.load.image('explosion_29',     './9. 폭발 이펙트/explosion29.png');  


    this.load.image('warning_ui',     './2. 게임화면/warning.png');


    this.load.image('level1_ui', './2. 게임화면/난이도1.png');
    this.load.image('level2_ui', './2. 게임화면/난이도2.png');
    this.load.image('level3_ui', './2. 게임화면/난이도3.png');
    // image
    this.load.image('character_choice_box_ui', './2. 게임화면/학생 선택창.png');
    this.load.image('nick_input_outbox_ui', './2. 게임화면/닉네임설정창.png');
    this.load.image('nick_input_inbox_ui1', './2. 게임화면/닉네임설정1.png');
    this.load.image('nick_input_inbox_ui2', './2. 게임화면/닉네임설정2.png');
    this.load.image('youtube_panel',        './1. 메인화면/유튜브 패널.png');
    this.load.image('start_setting_box_ui', './1. 메인화면/환경설정창.png');
    this.load.image('reader_outbox_ui',     './1. 메인화면/리더보드창.png');
    this.load.image('start_imformation_box_ui', './1. 메인화면/정보창.png');


    this.load.image('game_score_box_ui',     './2. 게임화면/점수표시.png');
    this.load.image('game_heart_ui',     './2. 게임화면/하트1.png');
    this.load.image('game_heart_break_ui',     './2. 게임화면/하트2.png');
    this.load.image('game_monster_ui',     './2. 게임화면/선생.png');


    this.load.image('character1_1',     './2. 게임화면/노노미1.png');
    this.load.image('character1_2',     './2. 게임화면/노노미2.png');

    this.load.image('character2_1',     './2. 게임화면/유우카1.png');
    this.load.image('character2_2',     './2. 게임화면/유우카2.png');

    this.load.image('character3_1',     './2. 게임화면/츠루기1.png');
    this.load.image('character3_2',     './2. 게임화면/츠루기2.png');

    this.load.image('character4_1',     './2. 게임화면/아리스1.png');
    this.load.image('character4_2',     './2. 게임화면/아리스2.png');


    this.load.image('character5_1',     './2. 게임화면/이즈나1.png');
    this.load.image('character5_2',     './2. 게임화면/이즈나2.png');

    this.load.image('character6_1',     './2. 게임화면/히나1.png');
    this.load.image('character6_2',     './2. 게임화면/히나2.png');
}
function copyTextToClipboard(text) {
    // 임시로 텍스트를 textarea 요소에 넣어 복사하기 위한 작업을 수행합니다.
    var textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);

    // 텍스트 선택 및 복사 작업을 수행합니다.
    textArea.select();
    document.execCommand('copy');

    // 임시 textarea 요소를 삭제합니다.
    document.body.removeChild(textArea);
}

function create() {
    this.input.addPointer(5); 
     loadingText.style.display = 'none';
    arrow = this.input.keyboard.createCursorKeys();
    this.input.on('pointerdown', function (pointer) {
        if(game_type == "in_game"&&(ingame_type == "first"||ingame_type == "game"||ingame_type == "warning"))
        {
            
            if(Math.abs(pointer.y - skill_button.y) > skill_button.height/2&&Math.abs(pointer.y - game_menu_button.y) > game_menu_button.height/2)
             {
                joy_stick_out.setVisible(true);
            joy_stick_in.setVisible(true);
            
            joy_stick_in.x = pointer.x;
            joy_stick_in.y = pointer.y;
            joy_stick_out.x = pointer.x;
            joy_stick_out.y = pointer.y;
            joy_is = true;
            }
           
        }
    });
    this.input.on('pointerup', function () { //마우스 클릭이 끝났을때
        if(game_type == "in_game"&&ingame_type == "game"&&joy_is == true)
        {

            joy_stick_out.setVisible(false);
            joy_stick_in.setVisible(false);
            joy_is = false;
            touch_m_left = false;
            touch_m_right =false;
        }
        for(var i = 0 ; i <animation_bool.length ; i++){ // 모든 클릭 버튼 탐색
            if(animation_bool[i] == false){ //크기가 전부 줄어든 버튼일경우 역순으로 바꾸고 시간 초기화
                animation_bool[i] = true;
                animation_sec[i] = 5 -animation_sec[i] ; 
            }
        }
    });
    this.input.on('pointermove', function (pointer) { //마우스를 움직일 때
         
         if(game_type == "in_game"&&ingame_type == "game"&&joy_is == true)
        {
            var jx = pointer.x - joy_stick_out.x;
            var jy = pointer.y - joy_stick_out.y;
               // console.log(Math.abs((joy_stick_in.x - joy_stick_out.x)*(joy_stick_in.y - joy_stick_out.y)));
            if(jx*jx + jy*jy >= 150*150 ){
                
                joy_stick_in.x = joy_stick_out.x+jx*150/Math.sqrt(jx*jx + jy*jy);
                joy_stick_in.y = joy_stick_out.y+jy*150/Math.sqrt(jx*jx + jy*jy);
            }
            else{
                joy_stick_in.x = pointer.x;
                joy_stick_in.y = pointer.y;
            }
            if(jx < 0 ){
            touch_m_left = true;
            touch_m_right =false;
            }
            else{
               
            touch_m_left = false;
            touch_m_right =true;
            }

        }
        if(togle1_drag){ //토글 클릭시 

            sound_set.bind(this)();
            start_setting_togle1.x = pointer.x; //마우스를 토글이 따라오도록
            game_bg_sound = (start_setting_togle1 - togle_min_x )*100/(togle_max_x - togle_min_x); // 음량은 토글좌표에서 토글 최소 값을 뺀 값 
            if(start_setting_togle1.x <togle_min_x){ // 토글이 최소값 아래로 안넘어가도록
                start_setting_togle1.x = togle_min_x;
            }
            else if(start_setting_togle1.x >togle_max_x){ // 토글이 최소값 아래로 안넘어가도록
                start_setting_togle1.x = togle_max_x;
            }

        }
        else if(togle2_drag){
            sound_set.bind(this)();
            start_setting_togle2.x = pointer.x;
            game_ip_sound = (start_setting_togle1 - togle_min_x )*100/(togle_max_x - togle_min_x);;
            if(start_setting_togle2.x <togle_min_x){
                start_setting_togle2.x = togle_min_x;
            }
            else if(start_setting_togle2.x >togle_max_x){ // 토글이 최소값 아래로 안넘어가도록
                start_setting_togle2.x = togle_max_x;
            }

        }
    });
    //************* 레이어 0 - 배경
    bg_image = this.add.image(540, 960, 'start_bg').setInteractive(); // 배경이미지
  
    bgm_1 = this.sound.add('bgm_m1', { loop: true });
    bgm_2 = this.sound.add('bgm_m2', { loop: true });
    end_w = this.sound.add('end_music_w');

    hit_m = this.sound.add('hit_m');
    warning_m = this.sound.add('warning_m1');
    skill_m_0 = this.sound.add('skill_m0');
    skill_m_1 = this.sound.add('skill_m1');
    skill_m_2 = this.sound.add('skill_m2');
    skill_m_3 = this.sound.add('skill_m3');
    skill_m_4 = this.sound.add('skill_m4');
    skill_m_5 = this.sound.add('skill_m5');

    choice_m_0 = this.sound.add('choice_m0');
    choice_m_1 = this.sound.add('choice_m1');
    choice_m_2 = this.sound.add('choice_m2');
    choice_m_3 = this.sound.add('choice_m3');
    choice_m_4 = this.sound.add('choice_m4');
    choice_m_5 = this.sound.add('choice_m5');

    impact_m_0 = this.sound.add('impact_m0', { loop: true });
    impact_m_1 = this.sound.add('impact_m1');
    impact_m_2 = this.sound.add('impact_m2');
    impact_m_3 = this.sound.add('impact_m3');
    impact_m_4 = this.sound.add('impact_m4');
    impact_m_5 = this.sound.add('impact_m5', { loop: true });
    close_m = this.sound.add('closem');
    get_item_m = this.sound.add('get_itemm');
    touch_m = this.sound.add('touchm');

    expolosion_m = this.sound.add('expolosionm');

    //************** 레이어 1  - 버튼
    start_button = this.add.image(540, 1493+64, 'start_button_ui').setInteractive(); // 리더 보드 버튼 
    start_button.on('pointerdown', function () {
        if(game_type == "start")
            button_down_animation(start_button);
    });
    start_button.on('pointerup', function () {
        if(game_type == "start")
            button_up_animation(start_button);
    });
    // - 시작버튼
  
    start_readerbord = this.add.image(540, 1664+64, 'start_readerbord_ui').setInteractive(); // 리더보드 버튼
    start_readerbord.on('pointerdown', function () {
        if(game_type == "start")
            button_down_animation(start_readerbord);
    });
    start_readerbord.on('pointerup', function () {
        if (isScoresFetched&&game_type == "start") { // fetchScores()로 데이터가 불러와진 경우에만 리더보드를 열도록 합니다.
            button_up_animation(start_readerbord); 
        }
    });
    // - 리더보드 버튼
 

    start_youtube = this.add.image(605+73, 43+65, 'start_youtube_ui').setInteractive(); // 리더보드 버튼
    start_youtube.on('pointerdown', function () {
        if(game_type == "start")
            button_down_animation(start_youtube);
    });
    start_youtube.on('pointerup', function () {
        if(game_type == "start")
            button_up_animation(start_youtube);
    });
    // - 유튜브 버튼

    start_dog = this.add.image(695+129, 294+116, 'start_dog_ui').setInteractive(); 
    start_dog.on('pointerdown', function () {
        if(game_type == "start")
            button_down_animation(start_dog);
    });
    start_dog.on('pointerup', function () {
        if(game_type == "start")
            button_up_animation(start_dog);
    });
 

    start_setting = this.add.image(751+73, 43+65, 'start_setting_ui').setInteractive(); 
    start_setting.on('pointerdown', function () {
        if(game_type == "start")
            button_down_animation(start_setting);
    });
    start_setting.on('pointerup', function () {
        if(game_type == "start")
            button_up_animation(start_setting);
    });
    // - 설정 버튼

    start_imformation = this.add.image(897+73, 43+65, 'start_imformation_ui').setInteractive(); 
    start_imformation.on('pointerdown', function () {
        if(game_type == "start")
            button_down_animation(start_imformation);
    });
    start_imformation.on('pointerup', function () {
        if(game_type == "start")
            button_up_animation(start_imformation);
    });

    back_start = this.add.image(540, 960, 'back_image').setInteractive(); // 배경이미지
  

    // - 정보 버튼
    start_imformation_box = this.add.image(540,960, 'start_imformation_box_ui').setInteractive(); // 
    start_imformation_youtube = this.add.image(540,1250, 'youtube_panel').setInteractive(); // 
     start_imformation_youtube.on('pointerdown', function () {
        button_down_animation(start_imformation_youtube);
    });
    start_imformation_youtube.on('pointerup', function () {
        button_up_animation(start_imformation_youtube);
    });


    reader_outbox = this.add.image(540, 960, 'reader_outbox_ui').setInteractive(); 


    // - 리더보드
    reader_right_button = this.add.image(880, 1740, 'reader_right_ui').setInteractive(); 
    reader_right_button.on('pointerdown', function () {
        button_down_animation(reader_right_button);
    });
    reader_right_button.on('pointerup', function () {
        button_up_animation(reader_right_button);
    });

    reader_left_button = this.add.image(200, 1740, 'reader_left_ui').setInteractive(); 
    reader_left_button.on('pointerdown', function () {
        button_down_animation(reader_left_button);
    });
    reader_left_button.on('pointerup', function () {
        button_up_animation(reader_left_button);
    });
    // 리더보드 화살표 버튼



    //환경설정

    //닉네임
    nick_input_outbox = this.add.image(540, 960, 'nick_input_outbox_ui').setInteractive(); 
    nick_input_inbox = this.add.image(540, 860, 'nick_input_inbox_ui2').setInteractive(); 
     back_button = this.add.image(100, 100, 'back_button_i').setInteractive(); 
    back_button.on('pointerdown', function () {
        button_down_animation(back_button);
    });
    back_button.on('pointerup', async function () {
        button_up_animation(back_button);
    });

     back_button2 = this.add.image(100, 100, 'back_button_i').setInteractive(); 
    back_button2.on('pointerdown', function () {
        button_down_animation(back_button2);
    });
    back_button2.on('pointerup', async function () {
        button_up_animation(back_button2);
    });



    nick_finish_button = this.add.image(540, 1100, 'nick_finish1_button_ui').setInteractive(); 
    nick_finish_button.on('pointerdown', function () {
        button_down_animation(nick_finish_button);
    });

    nick_finish_button.on('pointerup', async function () {
        button_up_animation(nick_finish_button);
    });

    let hintText = '이름을 입력 해주세요';


    nick_finish_text_box= this.add.text(540,840 , '100%', {fontFamily:"MainFont", fontSize: '35px', fill: '#A19AAD' }); //점수
    nick_finish_text_box.setOrigin(0.5,0);
    nick_input_text_box = this.add.rexBBCodeText(540, 860, hintText, {
        color: '#A19AAD',
        fontFamily: "MainFont",
        fontSize: '35px',
        fixedWidth: 400,
        fixedHeight: 65,
        backgroundColor: '#eaebeb',
        valign: 'center',
    })
    .setOrigin(0.68, 0.5)
    .setPadding(80, 0)
    .setInteractive()
    .on('pointerdown', function () {
        var config = {
            onOpen: function (textObject) {
                if (textObject.text === hintText) {
                    textObject.text = ''; // Clear the initial hint text
                }
            },
            onTextChanged: function (textObject, text) {
                // 띄어쓰기 제거
                text = text.replace(/\s+/g, '');
            
                // 한글 자음, 모음 및 영어 문자만 포함하는지 확인하는 정규 표현식
                const regex = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+$/;
            
                if (text.length > 8) {
                    text = text.substring(0, 8);
                }
            
                if (text.length >= 2 && regex.test(text)) {
                    textObject.text = text;
                } else {
                    textObject.text = hintText;
                }
            
                // Re-center the text
                textObject.setOrigin(0.68, 0.5);
            },            
            onClose: function (textObject) {
                if (textObject.text === '') {
                    textObject.text = hintText;
                }
                // Re-center the text when closing
                textObject.setOrigin(0.68, 0.5);
            },
            selectAll: true,
        };
        this.plugins.get('rextexteditplugin').edit(nick_input_text_box, config);
    }, this);

    //게임


    character_choice_box = this.add.image(540, 960, 'character_choice_box_ui').setInteractive(); 
    
     for (let i = 0; i < 6; i++) {
        var temp = this.add.image(character_vector[i][0],character_vector[i][1] , 'character'+(i+1).toString()+'_1').setInteractive();
        temp.setVisible(false);
        character_image.push(temp); // 캐릭터이미지 배열
       (function(index) {
            character_image[index].on('pointerdown', function () {
            button_down_animation(character_image[index]);
            //change_characher.bind(this)(index);
            });
        })(i);
        (function(index) {
            character_image[index].on('pointerup', function () {
            button_up_animation(character_image[index]);
            });
        })(i);
    }

    character_finish_button = this.add.image(540, 1500, 'character_finish_button_ui').setInteractive(); 
    character_finish_button.on('pointerdown', function () {
        button_down_animation(character_finish_button);
    });
    character_finish_button.on('pointerup', function () {
        button_up_animation(character_finish_button);
    });  //캐릭터 선택완료 ㅓ튼


    level_button[0]= this.add.image(540,810, 'level1_ui').setInteractive(); 
    level_button[0].on('pointerdown', function () {
        button_down_animation(level_button[0]);
    });
    level_button[0].on('pointerup', function () {
        button_up_animation(level_button[0]);
    });

    level_button[1]= this.add.image(540,960, 'level2_ui').setInteractive(); 
    level_button[1].on('pointerdown', function () {
        button_down_animation(level_button[1]);
    });
    level_button[1].on('pointerup', function () {
        button_up_animation(level_button[1]);
    });
    level_button[2]= this.add.image(540,1110, 'level3_ui').setInteractive(); 
    level_button[2].on('pointerdown', function () {
        button_down_animation(level_button[2]);
    });
    level_button[2].on('pointerup', function () {
        button_up_animation(level_button[2]);
    });

    game_level_image =this.add.image(540,131, 'game_level_normal').setInteractive();
    game_tier_image =this.add.image(540,206, 'game_tier_1').setInteractive();
    for (let i = 0; i < 15; i++) {
        var temp = this.add.image(0,0 , 'explosion01').setInteractive();
        temp.setVisible(false);
        break_impact.push(temp); // 폭발이미지 배열
    }

    for (let i = 0; i < 15; i++) {
        var temp = this.add.image(0,0 , 'game_monster_ui').setInteractive();
        temp.setVisible(false);
        temp.setScale(0.8);
        game_monster_image.push(temp); // 캐릭터이미지 배열
    }


    player_unit =  this.add.image(play_character.cx,play_character.cy, 'play_ball_4').setInteractive(); 
   
    skill_impact = this.add.image(540, 960, 'skill_impact_1').setInteractive();//스킬 임펙트
    game_drop_heart = this.add.image(540, 1800, 'game_heart_ui').setInteractive();//드랍 하트
    game_drop_weapon = this.add.image(540, 1800, 'skill_weapon_1').setInteractive();//
    game_drop_score = this.add.image(540, 1800, 'random_score').setInteractive();//
    game_drop_bomb = this.add.image(540, 1800, 'game_monster_ui').setInteractive();//
    game_drop_bomb.tint = 0x00ff00;
    skill_button = this.add.image(540, 1870, 'skill_button_1').setInteractive();//스킬 게이지

    skill_gaze_text  = this.add.text(620,1850 , '100%', {fontFamily:"MainFont", fontSize: '30px', fill: '#000000' }); //점수
    skill_gaze_text.setOrigin(0.5,0);

     skill_button.on('pointerdown', function () {
        if(character_choice_num == 3 && skill_is == false && play_character.skill_gaze > 0){
            if(aris_power == 0){
                play_character.skill_gaze -= 33;
                if(play_character.skill_gaze <= 0){
                    play_character.skill_gaze = 0;
                }
                aris_power = 1;
                aris_skill_is = true;

                button_down_animation(skill_button);
            }
        }
        else {

        button_down_animation(skill_button);
        }
    });
    skill_button.on('pointerup', function () {
        button_up_animation(skill_button);
        aris_skill_is = false;
    });

    skill_image = this.add.image(100, 300, 'skill_image_1').setInteractive();//스킬 명패



     for (let i = 0; i < 45; i++) {
        var temp = this.add.image(540,1500 , 'skill_nonomi').setInteractive();
        temp.setVisible(false);
        skill_nonomi_image.push(temp); // 캐릭터이미지 배열
    }

     for (let i = 0; i < 45; i++) {
        var temp = this.add.image(540,1500 , 'skill_hina').setInteractive();
        temp.setVisible(false);
        skill_hina_image.push(temp); // 캐릭터이미지 배열
    }


    game_bg1 = this.add.image(540, 34, 'game_bg1').setInteractive(); // 배경이미지
    game_bg2 = this.add.image(540, 68+14, 'game_bg2').setInteractive(); // 배경이미지


     for (let i = 0; i < 3; i++) {
        var temp = this.add.image(678+(80*i),30 , 'game_heart_ui').setInteractive();
        temp.setVisible(false);
        game_heal_image.push(temp); // 캐릭터이미지 배열
    }


     for (let i = 0; i < 10; i++) {
        var temp = this.add.image(678+(80*i),30 , 'izuna_1').setInteractive();
        temp.setVisible(false);
        skill_izuna_image.push(temp); // 캐릭터이미지 배열
    }


    warning_image =this.add.image(540,960, 'warning_ui').setInteractive();
    warning_image.setVisible(false);

    game_menu_button =this.add.image(990,54, 'game_menu_button_ui').setInteractive();
    game_menu_button.on('pointerdown', function () {
        if(game_type == "in_game")
            button_down_animation(game_menu_button);
    });
    game_menu_button.on('pointerup', function () {
        if(game_type == "in_game")
            button_up_animation(game_menu_button);
    });
    
    game_score_box =  this.add.image(180,56, 'game_score_box_ui').setInteractive(); 

    // 캐릭터


    game_score_text  = this.add.text(180, 23, '0', {fontFamily:"MainFont", fontSize: '50px', fill: '#ffffff' }); //점수
    game_score_text.setOrigin(0.5,0);
back_game = this.add.image(540, 960, 'back_image').setInteractive(); // 배경이미지
  
    menu_box =this.add.image(540,960, 'menu_box_ui').setInteractive();
    menu_giveup = this.add.image(810,1160, 'menu_giveup_ui').setInteractive(); 
     menu_giveup.on('pointerdown', function () {
        button_down_animation(menu_giveup);
    });
    menu_giveup.on('pointerup', function () {
        button_up_animation(menu_giveup);
    });
    menu_replay = this.add.image(540,1160, 'menu_replay_ui').setInteractive(); 
    menu_setting = this.add.image(270,1160, 'menu_setting_ui').setInteractive();
    menu_replay.on('pointerdown', function () {
        button_down_animation(menu_replay);
    });
    menu_replay.on('pointerup', function () {
        button_up_animation(menu_replay);
    });
    
    menu_setting.on('pointerdown', function () {
        button_down_animation(menu_setting);
    });
    menu_setting.on('pointerup', function () {
        button_up_animation(menu_setting);
    });
    

    menu_replay.on('pointerdown', function () {
        button_down_animation(menu_replay);
    });
    menu_replay.on('pointerup', function () {
        button_up_animation(menu_replay);
    });


    menu_giveup.on('pointerdown', function () {
        button_down_animation(menu_giveup);
    });
    menu_giveup.on('pointerup', function () {
        button_up_animation(menu_giveup);
    });
    


    menu_score_text  = this.add.text(760, 910, '0123', {fontFamily:"MainFont", fontSize: '50px', fill: '#ffffff' }); //점수
    menu_score_text.setOrigin(0.5,0);
    // 레이어 3


    start_setting_box = this.add.image(540, 960, 'start_setting_box_ui').setInteractive();
    start_setting_togle1 = this.add.image(640, 1025, 'start_togle_ui').setInteractive();
    start_setting_togle1.on('pointerdown', function () {
        togle1_drag = true;
    });
    start_setting_togle2 = this.add.image(640, 1149, 'start_togle_ui').setInteractive();
    start_setting_togle2.on('pointerdown', function () {
        togle2_drag = true; //토글 드래그 기능 활성화
    });
    end_outbox =this.add.image(540,960, 'game_end_box_ui').setInteractive();
    end_share_button = this.add.image(540,1560, 'game_share_button_ui').setInteractive(); 
    end_replay_button = this.add.image(540,1410, 'game_replay_button_ui').setInteractive(); 
    
     for (let i = 0; i < 12; i++) {

        var temp = this.add.image(0 ,0, 'reader_bg').setInteractive();
        temp.setVisible(false);
        reader_bg_image.push(temp);
        var temp = this.add.image(0 ,0, 'reader_c1').setInteractive();
        temp.setVisible(false);
        reader_character_image.push(temp);

        var temp = this.add.image(0 ,0, 'reader_l1').setInteractive();
        temp.setVisible(false);
        reader_level_image.push(temp);

        var temp = this.add.image(0 ,0, 'reader_t1').setInteractive();
        temp.setVisible(false);
        reader_tier_image.push(temp);


        var temp = this.add.text(0,0, '0', {fontFamily:"MainFont", fontSize: '38px', fill: '#313d4b' }); //점수
        temp.setVisible(false);
        reader_score_text.push(temp);

        var temp = this.add.text(0,0, '0', {fontFamily:"MainFont", fontSize: '38px', fill: '#313d4b' }); //점수
        temp.setVisible(false);
        reader_rank_text.push(temp); 

        var temp = this.add.text(0,0, '0', {fontFamily:"MainFont", fontSize: '38px', fill: '#313d4b' }); //점수
        temp.setVisible(false);
        reader_name_text.push(temp); 
    }
    end_share_button.on('pointerdown', function () {
        button_down_animation(end_share_button);
    });
    end_share_button.on('pointerup', function () {
        button_up_animation(end_share_button);
    });
    

    end_replay_button.on('pointerdown', function () {
        button_down_animation(end_replay_button);
    });
    end_replay_button.on('pointerup', function () {
        button_up_animation(end_replay_button);
    });
    end_tier_image =this.add.image(540,920, 'game_tier_1').setInteractive();
    end_score_text  =this.add.text(540, 1180, '123456', {fontFamily:"MainFont", fontSize: '75px', fill: '#000000' }); //점수
    end_score_text.setOrigin(0.5);


    close_button = this.add.image(870, 200, 'close_ui').setInteractive(); 
    close_button.on('pointerdown', function () {
        button_down_animation(close_button);
    });
    close_button.on('pointerup', function () {
        button_up_animation(close_button);
    });

    joy_stick_in = this.add.image(695+129, 294+116, 'joy_in_img').setInteractive();
    joy_stick_out = this.add.image(695+129, 294+116, 'joy_out_img').setInteractive();

    joy_stick_out.setVisible(false);
    joy_stick_in.setVisible(false);
    joy_is = false;    

    layer_clear.bind(this)("start_read");
    layer_clear.bind(this)("start_imfor");
    layer_clear.bind(this)("start_setting");
    layer_clear.bind(this)("nick_setting");
    layer_clear.bind(this)("character_choice");
    layer_clear.bind(this)("level_choice");
    layer_clear.bind(this)("in_game");
    layer_clear.bind(this)("end_game");
    layer_clear.bind(this)("game_menu");
    game_type_arr.push("start")
    change_layer();


}
function show_heart(){
    if(game_health_point > 0){
        for(var i = 0 ; i < 3;i++){
            if(i<play_level.game_max_health){
                game_heal_image[i].setVisible(true);
                if(i<game_health_point)
                    game_heal_image[i].setTexture('game_heart_ui');
                else{
                    game_heal_image[i].setTexture('game_heart_break_ui');
                }
            }
            else{
                game_heal_image[i].setVisible(false);
            }
        }
    }
    if(game_health_point == 0){
        for(var i = 0 ; i < play_level.game_max_health;i++){
            game_heal_image[i].setTexture('game_heart_break_ui');
        }
        
        game_type = "end_game";
        ingame_type = "die_first";
        game_type_arr.push("end_game");
        change_layer.bind(this)();
    }

}
function setting_tier_score(){
    if(get_reader.length >15){
        game_tier_score[0] = get_reader[15][3];
    }
    if(get_reader.length >31){
        game_tier_score[1] = get_reader[31][3];
    }
    if(get_reader.length >47){
        game_tier_score[2] = get_reader[47][3];
    }
}
function leader_show_surround()
{
    leader_surround_one(540,210 + 140,0);
    leader_surround_one(540,210 + 280,1);
    leader_surround_one(540,210 + 420,2);
}
//var get_reader =[["닉네임","사용캐릭","레벨","점수","순위","티어"]]; 
function reader_show_num(k)
{
    if(get_reader.length - (k+1)*8 > 0 ){
        for(var p = 8 *k; p < k*8 + 8; p++){
            reader_show_one(540,410 + (p%8)*140,p);
        }
    }
    else if(get_reader.length - k*8 < 8 ){
        var num = get_reader.length - k*8;
        console.log(num);
        for(var i = 0; i < num ;i++)
        {
            reader_show_one(540,410 + i*140,(k*8+i));
        }
        for(var p = num; p <8; p++){
            reader_bg_image[p].setVisible(false);
            reader_score_text[p].setVisible(false);
            reader_rank_text[p].setVisible(false);
            reader_level_image[p].setVisible(false);
            reader_tier_image[p].setVisible(false);
            reader_name_text[p].setVisible(false);
            reader_character_image[p].setVisible(false);
        }
    }
}
function reader_hide(){
    for(var p = 0; p <12; p++){
            reader_bg_image[p].setVisible(false);
            reader_score_text[p].setVisible(false);
            reader_rank_text[p].setVisible(false);
            reader_level_image[p].setVisible(false);
            reader_tier_image[p].setVisible(false);
            reader_name_text[p].setVisible(false);
            reader_character_image[p].setVisible(false);
    }
}
function cul_score(sc){
    if(game_score >= game_tier_score[0]){
        game_tier_image.setTexture('game_tier_4');
        end_tier_image.setTexture('game_tier_4');
    }
    else if(game_score >= game_tier_score[1]){
        game_tier_image.setTexture('game_tier_3');
        end_tier_image.setTexture('game_tier_3');
    }
    else if(game_score >= game_tier_score[2]){
        game_tier_image.setTexture('game_tier_2');
        end_tier_image.setTexture('game_tier_2');
    }
    else if(game_score >= game_tier_score[3]){
        game_tier_image.setTexture('game_tier_1');
        end_tier_image.setTexture('game_tier_1');
    }
    semi_socre += sc;
    weight_power +=1;
    //console.log(weight_power);
    if(semi_socre == 50){
        backPressed = false;
        semi_socre = semi_socre - 50;
        game_score +=play_level.per_sec_score;
    }
}
function leader_show_me(tx,ty){ 
    var s = 11;
    reader_score_text[s].setText(leader_me_arr[3]+"pt");
    reader_rank_text[s].setText(leader_me_arr[5] + "위");
    if (leader_me_arr && leader_me_arr[1] !== undefined && leader_me_arr[1] !== null) {
        reader_level_image[s].setTexture('reader_l' + leader_me_arr[1].toString());
    }
    /*
    if (leader_me_arr && leader_me_arr[4] !== undefined && leader_me_arr[4] !== null) {
        reader_tier_image[s].setTexture('reader_t' + leader_me_arr[4].toString());
    }*/
    if(leader_me_arr[5] <= 16)
            reader_tier_image[s].setTexture('reader_t4');
    else if(leader_me_arr[5] <= 32)
            reader_tier_image[s].setTexture('reader_t3');
    else if(leader_me_arr[5] <= 48)
            reader_tier_image[s].setTexture('reader_t2');
    else
            reader_tier_image[s].setTexture('reader_t1');
    
    if (leader_me_arr && leader_me_arr[0]) {
        reader_name_text[s].setText(leader_me_arr[0]);
    }
    
    if (leader_me_arr && leader_me_arr[2] !== undefined && leader_me_arr[2] !== null) {
        reader_character_image[s].setTexture('reader_c' + leader_me_arr[2].toString());
    }


    reader_bg_image[s].setVisible(true);
    reader_score_text[s].setVisible(true);
    reader_rank_text[s].setVisible(true);
    reader_level_image[s].setVisible(true);
    reader_tier_image[s].setVisible(true);
    reader_name_text[s].setVisible(true);
    reader_character_image[s].setVisible(true);


    reader_score_text[s].x = tx+50 ;
    reader_score_text[s].y = ty;

    reader_rank_text[s].x = tx + 250;
    reader_rank_text[s].y = ty;

    reader_level_image[s].x = tx - 175;
    reader_level_image[s].y = ty + 20;
    
    reader_name_text[s].x = tx - 237;
    reader_name_text[s].y = ty -15;


    reader_bg_image[s].x = tx;
    reader_bg_image[s].y = ty;

    reader_name_text[s].setOrigin(0, 0.5);
    reader_score_text[s].setOrigin(0,0.5);
    reader_rank_text[s].setOrigin(0,0.5);
    reader_tier_image[s].y = ty + 35;
    reader_tier_image[s].x = tx - 275;


    reader_character_image[s].y = ty;
    reader_character_image[s].x = tx - 325;
}
async function leader_surround_one(tx,ty,i){ 
    const leaderboard = new Leaderboard();
    await leaderboard.getSurroundingRanksWithScore(game_score)
    .then(fetchedSurroundData => {
        if (fetchedSurroundData) {
            // Populate the surround_arr with the fetched data
            for (let i = 0; i < fetchedSurroundData.length; i++) {
                surround_arr[i] = fetchedSurroundData[i];
            }
            console.log("Surrounding ranks:", surround_arr);
        }
    })
    .catch(err => {
        console.error("Error fetching surrounding ranks:", err);
    });
    var s = i + 8;
    reader_score_text[s].setText(surround_arr[i][3]+"pt");
    reader_rank_text[s].setText(surround_arr[i][5] + "위");
    if (surround_arr[i] && surround_arr[i][1] !== undefined && surround_arr[i][1] !== null) {
        reader_level_image[s].setTexture('reader_l' + surround_arr[i][1].toString());
    }
    /*
    if (surround_arr[i] && surround_arr[i][4] !== undefined && surround_arr[i][4] !== null) {
        reader_tier_image[s].setTexture('reader_t' + surround_arr[i][4].toString());
    }*/
    if(surround_arr[5] <= 15)
            reader_tier_image[s].setTexture('reader_t4');
    else if(surround_arr[5] <= 35)
            reader_tier_image[s].setTexture('reader_t3');
    else if(surround_arr[5] <= 50)
            reader_tier_image[s].setTexture('reader_t2');
    else
            reader_tier_image[s].setTexture('reader_t1');
    
    if (surround_arr[i] && surround_arr[i][0]) {
        reader_name_text[s].setText(surround_arr[i][0]);
    }
    
    if (surround_arr[i] && surround_arr[i][2] !== undefined && surround_arr[i][2] !== null) {
        reader_character_image[s].setTexture('reader_c' + surround_arr[i][2].toString());
    }

    reader_bg_image[s].setVisible(true);
    reader_score_text[s].setVisible(true);
    reader_rank_text[s].setVisible(true);
    reader_level_image[s].setVisible(true);
    reader_tier_image[s].setVisible(true);
    reader_name_text[s].setVisible(true);
    reader_character_image[s].setVisible(true);


    reader_score_text[s].x = tx+50 ;
    reader_score_text[s].y = ty;

    reader_rank_text[s].x = tx + 250;
    reader_rank_text[s].y = ty;

    reader_level_image[s].x = tx - 175;
    reader_level_image[s].y = ty + 20;
    
    reader_name_text[s].x = tx - 237;
    reader_name_text[s].y = ty -15;


    reader_bg_image[s].x = tx;
    reader_bg_image[s].y = ty;

    reader_name_text[s].setOrigin(0, 0.5);
    reader_score_text[s].setOrigin(0,0.5);
    reader_rank_text[s].setOrigin(0,0.5);
    reader_tier_image[s].y = ty + 35;
    reader_tier_image[s].x = tx - 275;


    reader_character_image[s].y = ty;
    reader_character_image[s].x = tx - 325;
}
function reader_show_one(tx,ty,i){
    var s = i%8;
    reader_score_text[s].setText(get_reader[i][3]+"pt");
    reader_rank_text[s].setText(i+1+ "위");
    if (get_reader[i] && get_reader[i][1] !== undefined && get_reader[i][1] !== null) {
        reader_level_image[s].setTexture('reader_l' + get_reader[i][1].toString());
    }
    //if (get_reader[i] && get_reader[i][4] !== undefined && get_reader[i][4] !== null) {
        
        if(i <= 15)
            reader_tier_image[s].setTexture('reader_t4');
        else if(i <= 35)
            reader_tier_image[s].setTexture('reader_t3');
        else if(i <= 50)
            reader_tier_image[s].setTexture('reader_t2');
        else
            reader_tier_image[s].setTexture('reader_t1');
    //}
    
    if (get_reader[i] && get_reader[i][0]) {
        reader_name_text[s].setText(get_reader[i][0]);
    }
    
    if (get_reader[i] && get_reader[i][2] !== undefined && get_reader[i][2] !== null) {
        reader_character_image[s].setTexture('reader_c' + get_reader[i][2].toString());
    }   // something 2번째 인덱스에 캐릭터 값 불러오기 


    reader_bg_image[s].setVisible(true);
    reader_score_text[s].setVisible(true);
    reader_rank_text[s].setVisible(true);
    reader_level_image[s].setVisible(true);
    reader_tier_image[s].setVisible(true);
    reader_name_text[s].setVisible(true);
    reader_character_image[s].setVisible(true);


    reader_score_text[s].x = tx+50 ;
    reader_score_text[s].y = ty;

    reader_rank_text[s].x = tx + 250;
    reader_rank_text[s].y = ty;

    reader_level_image[s].x = tx - 175;
    reader_level_image[s].y = ty + 20;
    
    reader_name_text[s].x = tx - 237;
    reader_name_text[s].y = ty -15;


    reader_bg_image[s].x = tx;
    reader_bg_image[s].y = ty;

    reader_name_text[s].setOrigin(0, 0.5);
    reader_score_text[s].setOrigin(0,0.5);
    reader_rank_text[s].setOrigin(0,0.5);
    reader_tier_image[s].y = ty + 35;
    reader_tier_image[s].x = tx - 275;


    reader_character_image[s].y = ty;
    reader_character_image[s].x = tx - 325;


}
function sound_set(num){
    var s = togle_max_x - togle_min_x ;
    bgm_1.setVolume((start_setting_togle1.x - togle_min_x)/s);
    bgm_2.setVolume((start_setting_togle1.x - togle_min_x)/s);

    end_w.setVolume((start_setting_togle1.x - togle_min_x)/s);
    warning_m.setVolume((start_setting_togle1.x - togle_min_x)*3 /s);
    skill_m_0.setVolume((start_setting_togle2.x - togle_min_x)*3 /s);
    skill_m_1.setVolume((start_setting_togle2.x - togle_min_x)*3 /s);
    skill_m_2.setVolume((start_setting_togle2.x - togle_min_x)*3 /s);
    skill_m_3.setVolume((start_setting_togle2.x - togle_min_x)*3 /s);
    skill_m_4.setVolume((start_setting_togle2.x - togle_min_x)*3 /s);
    skill_m_5.setVolume((start_setting_togle2.x - togle_min_x)*3 /s);

    impact_m_0.setVolume((start_setting_togle1.x - togle_min_x)*3 /s);
    impact_m_1.setVolume((start_setting_togle1.x - togle_min_x)*3 /s);
    impact_m_2.setVolume((start_setting_togle1.x - togle_min_x)*3 /s);
    impact_m_3.setVolume((start_setting_togle1.x - togle_min_x)*3 /s);
    impact_m_4.setVolume((start_setting_togle1.x - togle_min_x)*3 /s);
    impact_m_5.setVolume((start_setting_togle1.x - togle_min_x)*3 /s);
    hit_m.setVolume((start_setting_togle1.x - togle_min_x) /s);


    choice_m_0.setVolume((start_setting_togle2.x - togle_min_x)*2/s);
    choice_m_1.setVolume((start_setting_togle2.x- togle_min_x)*2/s);
    choice_m_2.setVolume((start_setting_togle2.x- togle_min_x)*2/s);
    choice_m_3.setVolume((start_setting_togle2.x- togle_min_x)*2/s);
    choice_m_4.setVolume((start_setting_togle2.x- togle_min_x)*2/s);
    choice_m_5.setVolume((start_setting_togle2.x- togle_min_x)*2/s);
    close_m.setVolume((start_setting_togle1.x - togle_min_x ) /s);
    touch_m.setVolume((start_setting_togle1.x - togle_min_x ) /s);
    get_item_m.setVolume((start_setting_togle1.x - togle_min_x) /s);
    expolosion_m.setVolume((start_setting_togle1.x - togle_min_x)*0.7/s);
}
function change_characher(num){
    if(num == 0){
        choice_m_0.play();
        choice_m_1.stop();
        choice_m_2.stop();
        choice_m_3.stop();
        choice_m_4.stop();
        choice_m_5.stop();
    }
    else if(num == 1){

        skill_impact.setTexture('skill_yuuka');
        choice_m_1.play();
        choice_m_0.stop();
        choice_m_2.stop();
        choice_m_3.stop();
        choice_m_4.stop();
        choice_m_5.stop();
    } 
    else if(num == 2){

        skill_impact.setTexture('skill_churugi');
        choice_m_2.play();
        choice_m_1.stop();
        choice_m_0.stop();
        choice_m_3.stop();
        choice_m_4.stop();
        choice_m_5.stop();
    } 
    else if(num == 3){

        skill_impact.setTexture('skill_aris');
        choice_m_3.play();
        choice_m_1.stop();
        choice_m_2.stop();
        choice_m_0.stop();
        choice_m_4.stop();
        choice_m_5.stop();
    } 
    else if(num == 4){
        choice_m_4.play();
        choice_m_1.stop();
        choice_m_2.stop();
        choice_m_3.stop();
        choice_m_0.stop();
        choice_m_5.stop();
    } 
    else if(num == 5){
        choice_m_5.play();
        choice_m_1.stop();
        choice_m_2.stop();
        choice_m_3.stop();
        choice_m_4.stop();
        choice_m_0.stop();
    } 
    skill_impact.setRotation(Math.PI/360 * 0);
    character_image[character_choice_num].setTexture('character'+(character_choice_num+1).toString()+'_1');
    character_image[num].setTexture('character'+(num+1).toString()+'_2');
    character_choice_num = num;
    skill_button.setTexture('skill_button_' +(character_choice_num+1).toString());
    player_unit.setTexture('play_ball_'+(character_choice_num+1).toString());
    game_drop_weapon.setTexture('skill_weapon_'+(character_choice_num+1).toString());
}
function layer_clear(type){ //레이어
    if(type == "start"){
        start_button.setVisible(false);
        start_youtube.setVisible(false);
        start_imformation.setVisible(false);
        start_setting.setVisible(false);
        start_readerbord.setVisible(false);
        start_dog.setVisible(false);
    }
    else if(type == "start_read"){
        fetchScoresAndSetFlag.bind(this)(); //new!
        back_start.setVisible(false);
        reader_outbox.setVisible(false);
        reader_left_button.setVisible(false);
        reader_right_button.setVisible(false);
        close_button.setVisible(false);
        reader_hide.bind(this)();
        reader_page_num = 0;
    }
    else if(type == "start_setting"){

        back_start.setVisible(false);
        start_setting_box.setVisible(false);
        start_setting_togle1 .setVisible(false);
        start_setting_togle2.setVisible(false);
        //start_setting_youtube.setVisible(false);
        close_button.setVisible(false);
    }
    else if(type == "start_imfor"){

        back_start.setVisible(false);
        start_imformation_box.setVisible(false);
        start_imformation_youtube.setVisible(false);
        //start_setting_youtube.setVisible(false);
        close_button.setVisible(false);
    }
    else if(type == "nick_setting"){
        nick_input_inbox.setVisible(false);
        nick_input_outbox.setVisible(false);
        nick_finish_button.setVisible(false);
        back_button.setVisible(false);
        back_button2.setVisible(false);
        nick_input_text_box.setVisible(false);
        nick_finish_text_box.setVisible(false);

    }
    else if(type == "character_choice"){
        back_button.setVisible(false);
        back_button2.setVisible(false);
        character_choice_box.setVisible(false);
        for(var i = 0 ; i < 6 ; i++){
            character_image[i].setVisible(false);
        }
        character_finish_button.setVisible(false);
        nick_finish_text_box.setVisible(false);
    }
    else if(type == "game_setting"){
        start_setting_box.setVisible(false);
        start_setting_togle1 .setVisible(false);
        start_setting_togle2.setVisible(false);
        //start_setting_youtube.setVisible(false);
        close_button.setVisible(false);
    }
    else if(type == "level_choice"){
        back_button2.setVisible(false);
        level_button[0].setVisible(false);
        level_button[1].setVisible(false);
        level_button[2].setVisible(false);
    }
    else if(type == "in_game"){
        warning_image.setVisible(false);
        skill_gaze_text.setVisible(false);
        skill_button.setVisible(false);
        game_score_box.setVisible(false);
        game_menu_button.setVisible(false);
        game_score_text.setVisible(false);
        game_bg1.setVisible(false);
        game_bg2.setVisible(false);
        player_unit.setVisible(false);
        skill_impact.setVisible(false);
        skill_image.setVisible(false);
        game_level_image.setVisible(false);
        game_tier_image.setVisible(false);

        game_drop_heart.setVisible(false);
        game_drop_weapon.setVisible(false);
        game_drop_score.setVisible(false);
        game_drop_bomb.setVisible(false);
        for(var i = 0 ; i < 12;i++){
            game_monster_image[i].setVisible(false);
        }
        for(var i = 0 ; i < 3;i++){
            game_heal_image[i].setVisible(false);
        }
        for (let i = 0; i < 10; i++) {
            skill_izuna_image[i].setVisible(false);
        }
        for (let i = 0; i < 45; i++) {
            skill_nonomi_image[i].setVisible(false); // 캐릭터이미지 배열
        }
        for (let i = 0; i < 45; i++) {
            skill_hina_image[i].setVisible(false); // 캐릭터이미지 배열
        }
        for (let i = 0; i < 15; i++) {
            break_impact[i].setVisible(false); // 폭발이미지 배열
        }
    }
    else if(type == "game_menu"){
        
        back_game.setVisible(false);
        menu_box.setVisible(false);
        menu_replay.setVisible(false);
        menu_setting.setVisible(false);
        menu_giveup.setVisible(false);
        menu_score_text.setVisible(false);
        close_button.setVisible(false);
        joy_stick_out.setVisible(false);
        joy_stick_in.setVisible(false);
        joy_is = false;
    }
    else if(type == "end_game"){
       
        reader_hide.bind(this)();
        back_game.setVisible(false);
        end_outbox.setVisible(false);
        end_tier_image.setVisible(false);
        end_share_button.setVisible(false);
        end_replay_button.setVisible(false);
        end_score_text.setVisible(false);
    }
}
function clear_game(){
    
    joy_stick_out.setVisible(false);
    joy_stick_in.setVisible(false);
    joy_is = false;    

         player_unit.setTexture('play_ball_' + (character_choice_num+1).toString());
    player_unit.setAlpha(1);
    game_score_text.setStyle({ fill: 'white' });
    setting_level.bind(this)();
    monster_timer = 0;
    aris_power = 0;
    skill_impact.setAlpha(1);
    game_drop_weapon_is = false;
    game_drop_heart_is = false;
    game_drop_score_is = false;
    game_drop_bomb_is = false;
    game_drop_weapon.setVisible(false);
    game_drop_score.setVisible(false);
    game_drop_heart.setVisible(false);
    game_type = "in_game";
    ingame_type ="first"; 
    game_health_point = play_level.game_max_health;
    game_type_arr.length = 0;
    skill_hina_impact.length = 0;
    skill_izuna_impact.length = 0;
    skill_nonomi_impact.length = 0;
    game_monster_arr.length = 0;
    break_impact_arr.length = 0;
     skill_is = false;
    play_character.skill_gaze = 100;
    play_character.cx = 540;
    player_unit.x = 540;
    monster_show.bind(this)();
    skill_impact.setVisible(false);
    game_score = 0;
    semi_socre = 0;
    weight_power = 0;

    text_color_time = 0;
    game_score_text.setText("0");
    end_score_text.setText("0pt");
    menu_score_text.setText("0pt");
    change_layer.bind(this)();  
    layer_clear.bind(this)("start_read");
    layer_clear.bind(this)("start_imfor");
    layer_clear.bind(this)("start_setting");
    layer_clear.bind(this)("nick_setting");
    layer_clear.bind(this)("character_choice");
    layer_clear.bind(this)("level_choice");
    layer_clear.bind(this)("start");
    layer_clear.bind(this)("end_game");
    layer_clear.bind(this)("game_menu");

}
function reset_game(){

    joy_stick_out.setVisible(false);
    joy_stick_in.setVisible(false);
    joy_is = false;    

    player_unit.setTexture('play_ball_' + (character_choice_num+1).toString());
    player_unit.setAlpha(1);
    game_score_text.setStyle({ fill: 'white' });
    monster_timer = 0;
    text_color_time = 0;
    skill_is = false;
    timer = 0 ;
    skill_impact.setAlpha(1);
    aris_power = 0;
    game_drop_weapon_is = false;
    game_drop_heart_is = false;
    game_drop_score_is = false;
    game_drop_bomb_is = false;
    game_drop_weapon.setVisible(false);
    game_drop_score.setVisible(false);
    game_drop_heart.setVisible(false);
    hit_timer =0;
    ingame_type ="first"; 
    play_character.skill_gaze = 100;
    game_health_point = 3;
    game_type_arr.length = 0;
    skill_hina_impact.length = 0;
    skill_izuna_impact.length = 0;
    skill_nonomi_impact.length = 0;
    game_monster_arr.length = 0;
    break_impact_arr.length = 0;
    game_score = 0;
    semi_socre = 0;
    weight_power = 0;
    game_type = "start";
    game_type_arr.push("start");
    game_score_text.setText("0");
    end_score_text.setText("0pt");
    menu_score_text.setText("0pt");
    play_character.cx = 540;
    player_unit.x = 540;
    monster_show.bind(this)();
    skill_impact.setVisible(false);
    change_layer.bind(this)();  
    layer_clear.bind(this)("start_read");
    layer_clear.bind(this)("start_imfor");
    layer_clear.bind(this)("start_setting");
    layer_clear.bind(this)("nick_setting");
    layer_clear.bind(this)("character_choice");
    layer_clear.bind(this)("level_choice");
    layer_clear.bind(this)("in_game");
    layer_clear.bind(this)("end_game");
    layer_clear.bind(this)("game_menu");
}
function change_layer(){
    if(game_type == "start"){
        //console.log("변경123");
        end_w.stop();
        if(bgm_1.isPlaying == false){
            bgm_1.play();
            bgm_2.stop();
        }
        else{
        }
        sound_set.bind(this)();
        bg_image.setTexture('start_bg');
        start_button.setVisible(true);
        start_youtube.setVisible(true);
        start_imformation.setVisible(true);
        start_setting.setVisible(true);
        start_readerbord.setVisible(true);
        start_dog.setVisible(true);
        //
    }
    else if(game_type == "start_read"){

        back_start.setVisible(true);
        reader_outbox.setVisible(true);
        reader_left_button.setVisible(true);
        reader_right_button.setVisible(true);
        close_button.setVisible(true);

        close_button.x = 940;
        close_button.y = 185;
        reader_show_num.bind(this)(0);
        leader_show_me.bind(this)(540,1300+280);
    }
    else if(game_type == "start_setting"){
     
        start_setting_box.setVisible(true);
        start_setting_togle1 .setVisible(true);
        start_setting_togle2.setVisible(true);
        close_button.setVisible(true);
        close_button.x = 950;
        close_button.y = 710;
    }
     else if(game_type == "start_imfor"){

        back_start.setVisible(true);
        start_imformation_box.setVisible(true);
        start_imformation_youtube.setVisible(true);
        close_button.setVisible(true);
        close_button.x = 950;
        close_button.y = 575;
    }
    else if(game_type == "nick_setting"){

        bg_image.setTexture('nick_bg');

        nick_input_inbox.setVisible(true);
        nick_input_outbox.setVisible(true);
        nick_finish_button.setVisible(true);
        back_button.setVisible(true);
        nick_input_text_box.setVisible(true);
        nick_finish_text_box.setVisible(false);
    }
    else if(game_type == "character_choice"){

        bg_image.setTexture('nick_bg');
        character_choice_box.setVisible(true);
         back_button.setVisible(true);
        for(var i = 0 ; i < 6 ; i++){
            character_image[i].setVisible(true);
        }
        character_finish_button.setVisible(false);
    }
    else if(game_type == "level_choice"){
        back_button2.setVisible(true);
        level_button[0].setVisible(true);
        level_button[1].setVisible(true);
        level_button[2].setVisible(true);
    }
    else if(game_type == "in_game")
    {  

        bgm_1.stop();

         bgm_2.play();

        skill_gaze_text.setVisible(true);
        skill_button.setVisible(true);
        bg_image.setTexture("game_bg");
        game_score_box.setVisible(true);
        game_menu_button.setVisible(true);
        game_score_text.setVisible(true);
        game_bg1.setVisible(true);
        game_bg2.setVisible(true);
        player_unit.setVisible(true);
        game_level_image.setVisible(true);
        game_tier_image.setVisible(true);

        for(var i = 0 ; i < 3;i++){
            game_heal_image[i].setVisible(true);
        }
    }
    else if(game_type == "game_menu"){
         joy_stick_out.setVisible(false);
        joy_stick_in.setVisible(false);
        joy_is = false;
        back_game.setVisible(true);
        menu_box.setVisible(true);
        menu_replay.setVisible(true);
        menu_setting.setVisible(true);
        menu_giveup.setVisible(true);
        menu_score_text.setText(game_score.toString() + "pt");
        menu_score_text.setVisible(true);
        close_button.x = 935;
        close_button.y = 685;
        close_button.setVisible(true);
    }
    else if(game_type == "end_game"){
         joy_stick_out.setVisible(false);
        joy_stick_in.setVisible(false);
        joy_is = false;
        back_game.setVisible(true);
        end_outbox.setVisible(true);
        end_share_button.setVisible(true);
        end_replay_button.setVisible(true);
        end_tier_image.setVisible(true);
        end_score_text.setVisible(true);
        end_score_text.setText(game_score.toString()+'pt');
    }
}

function gmae_type_exit(){
    console.log(game_type_arr);
    var temp = game_type_arr[game_type_arr.length-1];
    game_type_arr.pop(); //최상단 값 제거
    game_type = game_type_arr[game_type_arr.length-1];
    layer_clear.bind(this)(temp);
    change_layer.bind(this)(); //
}

function button_down_animation(button2){ //point down - 버튼 클릭시 줄어드는 애니메이션
    point_down_button.push(button2);
    //use_button.push(use);
    point_down_button_isclick.push(false);
    animation_sec.push(5);
    animation_bool.push(false);
}

function button_up_animation(button2){ ////point up - 버튼 클릭시 줄어드는 애니메이션
    if (point_down_button[point_down_button.length - 1] == button2) { //만약 가장 최근의 클릭한 버튼일 경우
        point_down_button_isclick[point_down_button_isclick.length -1] = true; // 이 버튼을 클릭한걸로 취급
    }
}

 function requestFullscreen() {
        var element = document.documentElement;

        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }

    // 전체 화면에서 나가는 함수
    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

async function button_fun(button1){//클릭 애니메이션 이후 버튼 발동
  if(button1 == start_readerbord && game_type != "start_read"){
    game_type = "start_read";
    game_type_arr.push("start_read");
    change_layer.bind(this)();
    touch_m.play();
  }
  else if(button1 == start_imformation&& game_type != "start_imfor"){
    game_type = "start_imfor";
    game_type_arr.push("start_imfor");
    change_layer.bind(this)();

        touch_m.play();
  }
  else if(button1 == start_dog&& game_type != "start_imfor"){
   var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

        if (!fullscreenElement) {
            requestFullscreen();
        } else {
            exitFullscreen();
        }
    touch_m.play();
  }
  else if(button1 == game_menu_button&& game_type != "game_menu"){
    game_type = "game_menu";
    game_type_arr.push("game_menu");
    change_layer.bind(this)();
  }
  else if(button1 == start_button&& game_type != "nick_setting"){
    if(finish_nick_is == true){

        game_type = "character_choice";
        layer_clear("start");
        game_type_arr.push("character_choice");
        change_layer.bind(this)();
    }
    else{
        nick_test_is = false;
        nick_finish_button.setTexture('nick_finish1_button_ui');
        game_type = "nick_setting";
        layer_clear("start");
        game_type_arr.push("nick_setting");
        change_layer.bind(this)();
        touch_m.play();
    }
  }
  else if(button1 == close_button){  
    close_m.play();
    gmae_type_exit.bind(this)();
    }
    else if(button1 == back_button){  
        close_m.play();
        reset_game.bind(this)();
    }
    else if(button1 == back_button2){  
        close_m.play();
        gmae_type_exit.bind(this)();
    }
    else if(button1 == reader_left_button){  
    if(reader_page_num > 0){
        reader_page_num -= 1;
        reader_show_num.bind(this)(reader_page_num);

        touch_m.play();
    }
    }
    else if(button1 == reader_right_button)
    {

        touch_m.play();
        if(get_reader.length - (reader_page_num +1) * 8 > 0){  
        reader_page_num +=1;
        reader_show_num.bind(this)(reader_page_num);
        }
    
    }
    else if(button1 == start_setting && game_type != "start_setting"){
        touch_m.play();

        back_start.setVisible(true);
        game_type = "start_setting";
        game_type_arr.push("start_setting");
        console.log(game_type_arr);
        change_layer.bind(this)();
    }

    else if(button1 == menu_setting && game_type != "start_setting"){
        touch_m.play();
        back_game.setVisible(true);
        game_type = "start_setting";
        game_type_arr.push("start_setting");
        change_layer.bind(this)();
    }
    else if(button1 == nick_finish_button){
        touch_m.play();
         if (nick_input_text_box.text.indexOf(' ') !== -1) {
            return;
        }
        if (nick_input_text_box.text.length > 8||nick_input_text_box.text.length < 2) {
            
            return;
        }
        if(nick_test_is == false){
        // 닉네임 중복확인
        const leaderboard = new Leaderboard();
        const uid = leaderboard.getCookie("firebaseUID");
        const enteredNickname = nick_input_text_box.text

        test_nick 
        // Debugging logs
        console.log("Debugging Info:");
        console.log("UID: ", uid);
        console.log("Entered Nickname: ", enteredNickname);

        if (!uid || !enteredNickname) {
            console.error("UID or Nickname is missing!");
            return;
        }
    
        if (!uid || !enteredNickname) {
            console.error("UID or Nickname is missing!");
            return;
        }
    
        const isTaken = await leaderboard.isNicknameTaken(enteredNickname, uid);
    
        if (!isTaken) {
            const userRef = firebase.database().ref(`scores/${uid}`);
            
            // 먼저 해당 uid의 레코드가 있는지 확인
            const snapshot = await userRef.once('value');
            if (!snapshot.exists()) {
                // 레코드가 없으면 먼저 생성 (여기서 다른 필드들도 초기화할 수 있습니다)
                await userRef.set({ nickname: enteredNickname });
            } else {
                // 레코드가 있으면 닉네임만 업데이트
                await userRef.update({ nickname: enteredNickname });
            }
            test_nick = nick_input_text_box.text;
            nick_test_is = true;
            nick_finish_text_box.setText(test_nick);
            nick_finish_button.setTexture('nick_finish2_button_ui');
            nick_input_text_box.setVisible(false);
            nick_finish_text_box.setVisible(true);
        } else {
            alert('닉네임이 이미 존재합니다!');
        }
        }
        else if(nick_test_is ==true){
                game_type = "character_choice";
                layer_clear("nick_setting");
                game_type_arr.push("character_choice");
                change_layer.bind(this)();
                finish_nick_is = true;
            
        }
    }
    else if(character_image.includes(button1)){
    touch_m.play();
    var index = 0;
    for(var i = 0 ; i < 6 ; i++)
    {
        if(button1 == character_image[i]){
        index = i;
        }
    }
    
    change_characher.bind(this)(index);
    character_finish_button.setVisible(true); // 선택 완료 버튼 
  }
  else if(level_button[0] == button1){
    touch_m.play();
    level_type = 0;
    game_level_image.setTexture('game_level_normal');
    game_type = "in_game";
    play_level = play_level_1;
    layer_clear("level_choice");
    game_type_arr.push("in_game");
    change_layer.bind(this)();
  }

  else if(level_button[1] == button1){
    touch_m.play();
    level_type = 1;
    game_level_image.setTexture('game_level_hardcore');
    play_level = play_level_2;
    game_type = "in_game";
    layer_clear("level_choice");
    game_type_arr.push("in_game");
    change_layer.bind(this)();
  }
  else if(level_button[2] == button1){
    touch_m.play();
    level_type = 2;
    play_level = play_level_3;
    game_level_image.setTexture('game_level_insane');
    game_type = "in_game";
    layer_clear("level_choice");
    game_type_arr.push("in_game");
    change_layer.bind(this)();
  }
  else if(character_finish_button == button1){
    touch_m.play();
    game_type = "level_choice";
    layer_clear("character_choice");
    game_type_arr.push("level_choice");
    change_layer.bind(this)();
  }
  else if(end_replay_button == button1)
  {
    touch_m.play();
    reset_game.bind(this)();
  }
  else if(end_share_button == button1)
  {
    touch_m.play();
    if(game_score >= game_tier_score[0]){
        copyTextToClipboard('센세 피하기 :' +game_score.toString()+'pt \n 플레티넘 달성!! \n https://blkayuka.github.io/FallingTeacher/ ');
    }
    else if(game_score >= game_tier_score[1]){
        copyTextToClipboard('센세 피하기 :' +game_score.toString()+'pt \n 골드 달성!! \n https://blkayuka.github.io/FallingTeacher/ ');
    }
    else if(game_score >= game_tier_score[2]){
        copyTextToClipboard('센세 피하기 :' +game_score.toString()+'pt \n 실버 달성!! \n https://blkayuka.github.io/FallingTeacher/ ');
    }
    else if(game_score >= game_tier_score[3]){
        copyTextToClipboard('센세 피하기 :' +game_score.toString()+'pt \n 브론즈 달성!! \n https://blkayuka.github.io/FallingTeacher/ ');
    }
    alert('클립보드에 공유 메세지가 복사되었습니다.');
  }
  else if(start_youtube == button1)
  {
    touch_m.play();
    window.open('https://youtube.com/@yuuka0314?si=f6Z88ofcghYsuMNl', '_blank'); // 이동할 URL을 지정합니다.
  }
  else if(start_imformation_youtube == button1)
  {
    touch_m.play();
    window.open('https://youtube.com/@yuuka0314?si=f6Z88ofcghYsuMNl', '_blank'); // 이동할 URL을 지정합니다.
  }

  else if(button1 == menu_giveup){

    touch_m.play();
    gmae_type_exit.bind(this)();
        game_type = "end_game";
        ingame_type = "die_first";
        game_type_arr.push("end_game");
        change_layer.bind(this)();
  }
  else if(button1 == menu_replay){

    touch_m.play();
    clear_game.bind(this)();
  }
  else if(button1 == skill_button){
    touch_m.play();
    skill_use.bind(this)();
  }
}

function spawn_monster(){
    var temp = [];
    temp.push(Phaser.Math.Between(50, 1030));
    temp.push(50);
    game_monster_arr.push(temp);
}
function spawn_heal(){
    game_drop_heart.x =Phaser.Math.Between(50, 1030);
    game_drop_heart.y = 50;
    game_drop_heart.setVisible(true);
    game_drop_heart_is = true;
}

function spawn_weapon(){
    game_drop_weapon.x = Phaser.Math.Between(50, 1030);
    game_drop_weapon.y = 50;
    game_drop_weapon.setVisible(true);
    game_drop_weapon_is = true;
}
function spawn_score(){
    game_drop_score.x = Phaser.Math.Between(50, 1030);
    game_drop_score.y = 50;
    game_drop_score.setVisible(true);
    game_drop_score_is = true;
}
function spawn_bomb(){
    game_drop_bomb.x = Phaser.Math.Between(50, 1030);
    game_drop_bomb.y = 50;
    game_drop_bomb.setVisible(true);
    game_drop_bomb_is = true;
}

function unit_move(){
    if(touch_left ==true|| touch_m_left == true){
            player_unit.setScale(-1,1);
            play_character.vector = -1;
            play_character.cx -= play_character.speed;
                if(play_character.cx <= player_unit.width/2){
                    play_character.cx = player_unit.width/2;
                    
                }
        }
        else if(touch_right ==true || touch_m_right == true){
            player_unit.setScale(1,1);
            play_character.vector = 1;
            play_character.cx += play_character.speed;
                if(play_character.cx >= 1080 -player_unit.width/2){
                    play_character.cx = 1080 - player_unit.width/2;
                }
        }
        player_unit.x =  play_character.cx; 
        if(character_choice_num == 1){
                skill_impact.x = player_unit.x;
        }
}
function hit_time(){
    if(hit_timer > 0 ){
        hit_timer -= 1;
        player_unit.setAlpha(1- hit_timer %0.8);
        player_unit.setTexture('play_ball_' + (character_choice_num+1).toString()+'h');
        
    }
    else{
         player_unit.setTexture('play_ball_' + (character_choice_num+1).toString());
   }
}
function spawn_expolosion(ex,ey){
    var temp = [];
    temp.push(3);
    temp.push(ex);
    temp.push(ey);
    break_impact_arr.push(temp);
    expolosion_m.play();
}
function collsize(){


       if(game_monster_arr.length > 0){
            for(var i= 0; i <game_monster_arr.length ; i++){
                if(Math.abs(game_monster_arr[i][0] - player_unit.x)  < game_monster_image[i].width/2 + player_unit.width/2 - 10){
                    if(Math.abs(game_monster_arr[i][1] - player_unit.y)  < game_monster_image[i].height/2 + player_unit.height/2 - 10)
                    {  
                            if(hit_timer == 0)
                            {
                            if(character_choice_num == 2&&play_character.skill_gaze > 0){
                                skill_m_2.play();
                                if(play_character.skill_gaze == 100){
                                skill_motion.bind(this)();
                                impact_m_2.play();
                                }
                                play_character.skill_gaze-=20;
                                skill_timer =Date.now();
                                skill_is=true;
                                var ag = game_monster_arr[i][0] - player_unit.x;
                                skill_impact.setRotation(Math.PI / 360 * ag/2);  
                                skill_impact.x = player_unit.x + ag;
                                skill_impact.setTexture('skill_churugi');
                            }

                            spawn_expolosion(game_monster_image[i].x,game_monster_image[i].y);
                            game_monster_arr.splice(i, 1);
                            if(character_choice_num == 1&&skill_is == true&&play_character.skill_gaze > 0){
                                
                            }
                            else if(character_choice_num == 2&&skill_is == true&&play_character.skill_gaze > 0){

                            }
                            else{
                                hit_m.play();
                                game_health_point -= 1;
                                hit_timer = 100;
                            }
                        }
                    }
                }
            } 
        }
        if(game_drop_weapon_is == true){
            if(Math.abs(game_drop_weapon.x - player_unit.x)  < game_drop_weapon.width/2 + player_unit.width/2 - 20){
                if(Math.abs(game_drop_weapon.y - player_unit.y)  < game_drop_weapon.height/2 + player_unit.height/2)
                {  
                    get_item_m.play();
                        play_character.skill_gaze = 100;
                        game_drop_weapon.setVisible(false);
                        game_drop_weapon_is = false;
                }
            }
        }
        if(game_drop_score_is == true){
            if(Math.abs(game_drop_score.x - player_unit.x)  < game_drop_score.width/2 + player_unit.width/2 - 20){
                if(Math.abs(game_drop_score.y - player_unit.y)  < game_drop_score.height/2 + player_unit.height/2)
                {  
                    get_item_m.play();
                    game_score += Phaser.Math.Between(play_level.random_socre_min, play_level.random_socre_max);
                    text_color_time = 150;
                    if(game_score <=0)
                        game_score = 0;
                    game_drop_score.setVisible(false);
                    game_drop_score_is = false;
                }
            }
        }
        if(game_drop_bomb_is == true){
            if(Math.abs(game_drop_bomb.x - player_unit.x)  < game_drop_bomb.width/2 + player_unit.width/2 - 20){
                if(Math.abs(game_drop_bomb.y - player_unit.y)  < game_drop_bomb.height/2 + player_unit.height/2)
                {  
                    expolosion_m.play();
                    game_score += Phaser.Math.Between(play_level.random_bomb_min, play_level.random_bomb_max);
                    text_color_time = -150;
                    if(game_score <=0)
                        game_score = 0;
                    game_drop_bomb.setVisible(false);
                    game_drop_bomb_is = false;
                }
            }
        }

        if(game_drop_heart_is == true){
            if(Math.abs(game_drop_heart.x - player_unit.x)  < game_drop_heart.width/2 + player_unit.width/2 - 20){
                if(Math.abs(game_drop_heart.y - player_unit.y)  < game_drop_heart.height/2 + player_unit.height/2 - 20)
                {  
                        game_health_point += 1;
                        if(game_health_point > play_level.game_max_health){
                            game_health_point = play_level.game_max_health;
                        }
                        game_drop_heart.setVisible(false);
                        game_drop_heart_is = false;
                }
            }
        }
}
function setting_level(){
    game_drop_timer[0] = play_level.monster_respawn *10;
    game_drop_timer[1] = play_level.heal_respawn *3;
    game_drop_timer[2] = play_level.weapon_respawn *4;
    game_drop_timer[3] = play_level.score_respawn *6;
    game_drop_timer[4] = play_level.bomb_respawn *10;
}
function drop_obj(){
    for(var i = 0 ; i <5; i++){ // 0 몬스터 // 1 하트 // 2 무기
        game_drop_timer[i] -= 1;
    }
    if(game_drop_timer[0] <= 0){
        spawn_monster.bind(this)();
        game_drop_timer[0] = play_level.monster_respawn *10 - weight_power*play_level.monster_extra_respawn/(weight_power+10000)*10;
    }
    if(game_drop_timer[1] <= 0){
        spawn_heal.bind(this)();
        game_drop_timer[1] = play_level.heal_respawn *10;
    }    
    if(game_drop_timer[2] <= 0){
        spawn_weapon.bind(this)();
        game_drop_timer[2] = play_level.weapon_respawn *10;
    }
     if(game_drop_timer[3] <= 0){
        spawn_score.bind(this)();
        game_drop_timer[3] = play_level.score_respawn *10;
    }
     if(game_drop_timer[4] <= 0){
        spawn_bomb.bind(this)();
        game_drop_timer[4] = play_level.bomb_respawn *10;
    }
}
function skill_motion(){
    skill_image.setTexture("skill_image_"+character_choice_num.toString());
    motion_timer = 500;
    skill_image.x = -200;
    skill_image.setVisible(true);
}
var skill_cool = false;
function key_pc(){
        if (arrow.left.isDown) {
            touch_left = true;
            touch_right =false;

        } 
        else if (arrow.right.isDown) {
            touch_left = false;
            touch_right =true;
        }
        if (arrow.left.isDown == false) {
            touch_left = false;
        } 
        if (arrow.right.isDown == false) {
            touch_right =false;
        }
        if(arrow.down.isDown && skill_cool == false){
            if(aris_power == 0 && character_choice_num == 3&&skill_is == false&&play_character.skill_gaze > 0){
                play_character.skill_gaze -= 33;
                if(play_character.skill_gaze <= 0){
                    play_character.skill_gaze = 0;
                }
                aris_power = 1;
            }
            if(aris_power >0 && character_choice_num == 3 && play_character.skill_gaze > 0&&skill_is == false){
                play_character.skill_gaze -=1;
                aris_power += 1;
                if(play_character.skill_gaze <= 0){
                    play_character.skill_gaze = 0;
                }
            }
            else {
            skill_use.bind(this)();
            skill_cool = true;
            }
            //skill_image.x = -100;
            //skill_image.setVisible(true);
        }

        if(arrow.down.isUp){
            if(character_choice_num == 3 &&aris_power > 0 && aris_skill_is == false){

                skill_use.bind(this)();
                skill_cool = false;
            }
            skill_cool = false;
        }

}


function nonomi_skill(){

    if(skill_is == true)
    {
        if(Date.now() - skill_timer > 100&&play_character.skill_gaze > 0){
        skill_timer = Date.now();
        play_character.skill_gaze -= 2;
        var angle = nonomi_angle[((100 - play_character.skill_gaze)/2)  % 16]; 
        var temp= [play_character.cx ,play_character.cy ,angle];
        skill_nonomi_impact.push(temp);
        for (var i = 0 ; i  < skill_nonomi_impact.length ; i++){
                skill_nonomi_image[i].setOrigin(0.5);
                skill_nonomi_image[i].setRotation(Math.PI / 360 * skill_nonomi_impact[i][2]);     
            }
        }

        if(play_character.skill_gaze <= 0){
        skill_is = false;
        }
    }

     if(skill_nonomi_impact.length == 0){
            for(var i = 0 ; i < skill_nonomi_impact.length ; i++){
                skill_nonomi_image[i].setVisible(false);
            }
    }
    if(skill_nonomi_impact.length > 0){
        for(var i = 0 ; i < skill_nonomi_impact.length ; i++){
            skill_nonomi_impact[i][0] += 6*skill_nonomi_impact[i][2]/15;
            skill_nonomi_impact[i][1] -= 30;
            skill_nonomi_image[i].x = skill_nonomi_impact[i][0];
            skill_nonomi_image[i].y = skill_nonomi_impact[i][1];
            skill_nonomi_image[i].setVisible(true);
            for(var k= 0; k <game_monster_arr.length ; k++){
                if(Math.abs(game_monster_arr[k][0] - skill_nonomi_image[i].x)  < game_monster_image[k].width/2 + skill_nonomi_image[i].width/2){
                    if(Math.abs(game_monster_arr[k][1] - skill_nonomi_image[i].y)  < game_monster_image[k].height/2 + skill_nonomi_image[i].height/2)
                    {  
                        spawn_expolosion(game_monster_image[k].x,game_monster_image[k].y);
                        game_monster_arr.splice(k, 1);
                        skill_nonomi_impact.splice(i, 1);
                    }
                }
            } 
            if(Math.abs(game_drop_heart.x - skill_nonomi_image[i].x)  < game_drop_heart.width/2 + skill_nonomi_image[i].width/2 &&game_drop_heart_is == true){
                if(Math.abs(game_drop_heart.y - skill_nonomi_image[i].y)  < game_drop_heart.height/2 + skill_nonomi_image[i].height/2)
                    {  
                    spawn_expolosion(game_drop_heart.x,game_drop_heart.y);
                    game_drop_heart_is = false;
                    game_drop_heart.setVisible(false);
                    skill_nonomi_impact.splice(i, 1);
                    }
                }
                if(Math.abs(game_drop_weapon.x - skill_nonomi_image[i].x)  < game_drop_weapon.width/2 + skill_nonomi_image[i].width/2 &&game_drop_weapon_is == true){
                    if(Math.abs(game_drop_weapon.y - skill_nonomi_image[i].y)  < game_drop_weapon.height/2 + skill_nonomi_image[i].height/2)
                    {  
                        spawn_expolosion(game_drop_weapon.x,game_drop_weapon.y);
                        game_drop_weapon_is = false;
                        game_drop_weapon.setVisible(false);
                        skill_nonomi_impact.splice(i, 1);
                    }
                }
                 if(Math.abs(game_drop_score.x - skill_nonomi_image[i].x)  < game_drop_score.width/2 + skill_nonomi_image[i].width/2 &&game_drop_score_is == true){
                    if(Math.abs(game_drop_score.y - skill_nonomi_image[i].y)  < game_drop_score.height/2 + skill_nonomi_image[i].height/2)
                    {  
                        spawn_expolosion(game_drop_score.x,game_drop_score.y);
                        game_drop_score_is = false;
                        game_drop_score.setVisible(false);
                        skill_nonomi_impact.splice(i, 1);
                    }
                }

                 if(Math.abs(game_drop_bomb.x - skill_nonomi_image[i].x)  < game_drop_bomb.width/2 + skill_nonomi_image[i].width/2 &&game_drop_bomb_is == true){
                    if(Math.abs(game_drop_bomb.y - skill_nonomi_image[i].y)  < game_drop_bomb.height/2 + skill_nonomi_image[i].height/2)
                    {  
                        spawn_expolosion(game_drop_bomb.x,game_drop_bomb.y);
                        game_drop_bomb_is = false;
                        game_drop_bomb.setVisible(false);
                        skill_nonomi_impact.splice(i, 1);
                    }
                }
                if( skill_nonomi_image[i].x > 1150 || skill_nonomi_image[i].x < -50 ||skill_nonomi_image[i].y < 150 ){
                    skill_nonomi_impact.splice(i, 1);
                }

            }
            for(var i = skill_nonomi_impact.length ; i < 30;i++)
            {
                skill_nonomi_image[i].setVisible(false);

            }
            for (var i = 0 ; i  < skill_nonomi_impact.length ; i++){

                skill_nonomi_image[i].x = skill_nonomi_impact[i][0];
                skill_nonomi_image[i].y = skill_nonomi_impact[i][1];
                skill_nonomi_image[i].setOrigin(0.5);
                skill_nonomi_image[i].setRotation(Math.PI / 360 * skill_nonomi_impact[i][2]);
            }
        }
    
}
function churugi_skill(){

    if(skill_is == true&&play_character.skill_gaze > 0)
    {
        //play_character.skill_gaze -=25;
        if(Date.now() - skill_timer < 500 ){
        skill_impact.setVisible(true);
        //skill_impact.x = player_unit.x;
        skill_impact.y= player_unit.y - 280;
        skill_impact.setAlpha(1 - (Date.now() - skill_timer)/500);
        if(game_monster_arr.length > 0){
            for(var i= 0; i <game_monster_arr.length ; i++){
                if(Math.abs(game_monster_arr[i][0] - skill_impact.x)  < game_monster_image[i].width/2 + skill_impact.width/2 +50){
                    if(Math.abs(game_monster_arr[i][1] - skill_impact.y)  < game_monster_image[i].height/2 + skill_impact.height/2 +50)
                    {  
                            spawn_expolosion(game_monster_image[i].x,game_monster_image[i].y);
                            game_monster_arr.splice(i, 1);
                    }
                }
            } 
        }
        }
        else{

        skill_impact.setVisible(false);
        }

    }
}
var sound_is = false;
function skill_sound(){
    if(skill_is == true&& play_character.skill_gaze > 0&&sound_is == false){
        if(character_choice_num == 0 ){
            impact_m_0.play();
        }
        else if(character_choice_num == 5 ){
            impact_m_5.play();
        }

        sound_is = true;
    }  
    else if(skill_is == false&&sound_is == true){
        sound_is = false;
        if(character_choice_num == 0 ){
            impact_m_0.stop();
        }
        else if(character_choice_num == 5 ){
            impact_m_5.stop();
        }
    } 
    else if(game_type != "in_game")
    {
        impact_m_0.stop();
        impact_m_1.stop();
        impact_m_5.stop();
    }
}
function hina_skill(){

     if(skill_hina_impact.length == 0){
            for(var i = 0 ; i < skill_hina_impact.length ; i++){
                skill_hina_image[i].setVisible(false);
            }
    }
    if(skill_is == true&&play_character.skill_gaze > 0)
    {
        if(Date.now() - skill_timer > 100&&play_character.skill_gaze > 0){
            skill_timer = Date.now();
            play_character.skill_gaze -= 3; 
            skill_hina_impact.push([play_character.cx ,play_character.cy ,30]);
            skill_hina_impact.push([play_character.cx ,play_character.cy ,0]);
            skill_hina_impact.push([play_character.cx ,play_character.cy ,-30]);
            for (var i = 0 ; i  < skill_hina_impact.length ; i++)
            {
                skill_hina_image[i].setVisible(true);
                skill_hina_image[i].setOrigin(0.5);
                skill_hina_image[i].setRotation(Math.PI / 360 * skill_hina_impact[i][2]);     
            }
        }
    }

    if(skill_hina_impact.length > 0){
            for(var i = 0 ; i < skill_hina_impact.length ; i++){
                skill_hina_impact[i][0] += 6*skill_hina_impact[i][2]/15;
                skill_hina_impact[i][1] -= 30;
                skill_hina_image[i].x = skill_hina_impact[i][0];
                skill_hina_image[i].y = skill_hina_impact[i][1];
                skill_hina_image[i].setVisible(true);
                for(var k= 0; k <game_monster_arr.length ; k++){
                    if(Math.abs(game_monster_arr[k][0] - skill_hina_image[i].x)  < game_monster_image[k].width/2 + skill_hina_image[i].width/2){
                        if(Math.abs(game_monster_arr[k][1] - skill_hina_image[i].y)  < game_monster_image[k].height/2 + skill_hina_image[i].height/2)
                        {  
                            spawn_expolosion(game_monster_image[k].x,game_monster_image[k].y);
                            game_monster_arr.splice(k, 1);
                            skill_hina_impact.splice(i, 1);
                        }
                    }
                } 
                if(Math.abs(game_drop_heart.x - skill_hina_image[i].x)  < game_drop_heart.width/2 + skill_hina_image[i].width/2 &&game_drop_heart_is == true){
                        if(Math.abs(game_drop_heart.y - skill_hina_image[i].y)  < game_drop_heart.height/2 + skill_hina_image[i].height/2)
                        {  
                            spawn_expolosion(game_drop_heart.x,game_drop_heart.y);
                            game_drop_heart_is = false;
                            game_drop_heart.setVisible(false);
                            skill_hina_impact.splice(i, 1);
                        }
                    }
                    if(Math.abs(game_drop_weapon.x - skill_hina_image[i].x)  < game_drop_weapon.width/2 + skill_hina_image[i].width/2 &&game_drop_weapon_is == true){
                        if(Math.abs(game_drop_weapon.y - skill_hina_image[i].y)  < game_drop_weapon.height/2 + skill_hina_image[i].height/2)
                        {  
                            spawn_expolosion(game_drop_weapon.x,game_drop_weapon.y);
                            game_drop_weapon_is = false;
                            game_drop_weapon.setVisible(false);
                            skill_hina_impact.splice(i, 1);
                        }
                    }
                     if(Math.abs(game_drop_score.x - skill_hina_image[i].x)  < game_drop_score.width/2 + skill_hina_image[i].width/2 &&game_drop_score_is == true){
                        if(Math.abs(game_drop_score.y - skill_hina_image[i].y)  < game_drop_score.height/2 + skill_hina_image[i].height/2)
                        {  
                            spawn_expolosion(game_drop_score.x,game_drop_score.y);
                            game_drop_score_is = false;
                            game_drop_score.setVisible(false);
                            skill_hina_impact.splice(i, 1);
                        }
                    }
                    if(Math.abs(game_drop_bomb.x - skill_hina_image[i].x)  < game_drop_bomb.width/2 + skill_hina_image[i].width/2 &&game_drop_bomb_is == true){
                        if(Math.abs(game_drop_bomb.y - skill_hina_image[i].y)  < game_drop_bomb.height/2 + skill_hina_image[i].height/2)
                        {  
                            spawn_expolosion(game_drop_bomb.x,game_drop_bomb.y);
                            game_drop_bomb_is = false;
                            game_drop_bomb.setVisible(false);
                            skill_hina_impact.splice(i, 1);
                        }
                    }
                if( skill_hina_image[i].x > 1150 || skill_hina_image[i].x < -50 ||skill_hina_image[i].y < 150 ){
                    skill_hina_impact.splice(i, 1);
                }


            }
            for(var i = skill_hina_impact.length ; i < 30;i++)
            {
                skill_hina_image[i].setVisible(false);

            }
            for (var i = 0 ; i  < skill_hina_impact.length ; i++){

                skill_hina_image[i].x = skill_hina_impact[i][0];
                skill_hina_image[i].y = skill_hina_impact[i][1];
                skill_hina_image[i].setOrigin(0.5);
                skill_hina_image[i].setRotation(Math.PI / 360 * skill_hina_impact[i][2]);
            }
        }
        if(play_character.skill_gaze <=0)
                play_character.skill_gaze = 0;
    
}

function yuuka_skill(){
    if(skill_is == true)
    {
        if(Date.now() - skill_timer > 100&&play_character.skill_gaze > 0){
            skill_timer = Date.now();
            play_character.skill_gaze -= 1;
            
            skill_impact.setVisible(true);
            skill_impact.x = player_unit.x;
            skill_impact.y = player_unit.y;
            if(game_monster_arr.length > 0){
                for(var i= 0; i <game_monster_arr.length ; i++){
                    if(Math.abs(game_monster_arr[i][0] - skill_impact.x)  < game_monster_image[i].width/2 + skill_impact.width){
                        if(Math.abs(game_monster_arr[i][1] - skill_impact.y)  < game_monster_image[i].height/2 + skill_impact.height)
                        {  
                            spawn_expolosion(game_monster_image[i].x,game_monster_image[i].y);
                            game_monster_arr.splice(i, 1);
                        }
                    }
                } 
            }
            if(play_character.skill_gaze <= 0){
                skill_is = false;
                skill_impact.setVisible(false);
            }
        }
    }
}
function skill_show()
{
    
    if(character_choice_num ==0)
    {
      nonomi_skill.bind(this)();
    }
    else if(character_choice_num ==1){
        yuuka_skill.bind(this)();
    }
    else if(character_choice_num ==2){
        churugi_skill.bind(this)();
    }
    else if(character_choice_num ==3){
        if(skill_is== true){
        skill_impact.y -= skill_speed[1]*1.3;
        skill_impact.setAlpha( 1- (skill_impact.y%4)/10);
        if(game_monster_arr.length > 0){
            for(var i= 0; i <game_monster_arr.length ; i++){
                if(Math.abs(game_monster_arr[i][0] - skill_impact.x)  < game_monster_image[i].width/2 + skill_impact.width/2){
                    if(Math.abs(game_monster_arr[i][1] - skill_impact.y)  < game_monster_image[i].height/2 + skill_impact.height/2)
                    {  
                    spawn_expolosion(game_monster_image[i].x,game_monster_image[i].y);
                    game_monster_arr.splice(i, 1);
                    }
                }
            } 
        }
        if(Math.abs(game_drop_heart.x - skill_impact.x)  < game_drop_heart.width/2 + skill_impact.width/2 &&game_drop_heart_is == true){
            if(Math.abs(game_drop_heart.y - skill_impact.y)  < game_drop_heart.height/2 + skill_impact.height/2)
                {  
                    spawn_expolosion(game_drop_heart.x,game_drop_heart.y);
                    game_drop_heart_is = false;
                    game_drop_heart.setVisible(false);
                    skill_hina_impact.splice(i, 1);
                }
            }
            if(Math.abs(game_drop_weapon.x - skill_impact.x)  < game_drop_weapon.width/2 + skill_impact.width/2 &&game_drop_weapon_is == true){
                if(Math.abs(game_drop_weapon.y - skill_impact.y)  < game_drop_weapon.height/2 + skill_impact.height/2)
                {  
                    spawn_expolosion(game_drop_weapon.x,game_drop_weapon.y);
                    game_drop_weapon_is = false;
                    game_drop_weapon.setVisible(false);
                }
            }
            if(Math.abs(game_drop_score.x - skill_impact.x)  < game_drop_score.width/2 + skill_impact.width/2 &&game_drop_score_is == true){
                if(Math.abs(game_drop_score.y - skill_impact.y)  < game_drop_score.height/2 + skill_impact.height/2)
                {  
                    spawn_expolosion(game_drop_score.x,game_drop_score.y);
                    game_drop_score_is = false;
                    game_drop_score.setVisible(false);
                }
            }
               if(Math.abs(game_drop_bomb.x - skill_impact.x)  < game_drop_bomb.width/2 + skill_impact.width/2 &&game_drop_bomb_is == true){
                if(Math.abs(game_drop_bomb.y - skill_impact.y)  < game_drop_bomb.height/2 + skill_impact.height/2)
                {  
                    spawn_expolosion(game_drop_bomb.x,game_drop_bomb.y);
                    game_drop_bomb_is = false;
                    game_drop_bomb.setVisible(false);
                }
            }

            if(skill_impact.y < - skill_impact.height/2){
                //skill_impact.setVisible(false);
                aris_power = 0;
                skill_is =false;
                skill_impact.y = 1500;
                skill_impact.setVisible(false);
            }
        }   
    }
    else if(character_choice_num ==4){
        
    }
    else if(character_choice_num ==5){
        hina_skill.bind(this)();
    }
}
function skill_use(){
    if(play_character.skill_gaze > 0 || aris_power != 0 && skill_cool == false){
        if(character_choice_num ==0){

            console.log(skill_is);
            if(skill_is == false){
                skill_is = true;
                if(play_character.skill_gaze == 100){
                    skill_motion.bind(this)();
                    skill_m_0.play();
                }
                skill_timer = Date.now();
            }
            else {
                skill_is = false;
                skill_m_0.stop();
            }
        }
        else if(character_choice_num ==1){
            if(skill_is == false){
                if(play_character.skill_gaze == 100){

                skill_timer = Date.now();
                skill_motion.bind(this)();
                skill_m_1.play();
                impact_m_1.play();
                }
                skill_is = true;
            }
            skill_impact.setTexture('skill_yuuka');
            
        }
        else if(character_choice_num ==2){
        }
        else if(character_choice_num ==3){ // 아리스 
            if(skill_is == false && aris_power >0){
                aris_skill_is = false;
                skill_impact.setTexture("skill_aris");
                skill_is = true;
                impact_m_3.play();
                if(play_character.skill_gaze == 100){
                    skill_motion.bind(this)();
                    skill_m_3.play();
                }
                skill_impact.setVisible(true);
                skill_impact.setScale(1 + aris_power/30);
                skill_impact.y = 1500;
                skill_impact.x = play_character.cx;
                
            }
        }
        else if(character_choice_num ==4){ //

                impact_m_4.play();
                if(play_character.skill_gaze == 100){
                skill_motion.bind(this)();
                skill_m_4.play();
                }
                play_character.skill_gaze -= 20;
                if(play_character.skill_gaze <= 1){
                    play_character.skill_gaze =0;
                }

                var tmp = [1,play_character.cx,play_character.cy];
                skill_izuna_impact.push(tmp);
                hit_timer = 100;
                play_character.cx+= play_character.vector*534;
                if(play_character.cx > 1080 - player_unit.width/2){
                    play_character.cx = 1080 - player_unit.width/2;
                }
                else if(play_character.cx < player_unit.width/2){
                    play_character.cx = player_unit.width/2;
                }
        }
        else if(character_choice_num ==5){
            if(skill_is == false){
                if(play_character.skill_gaze == 100){
                skill_motion.bind(this)();
                skill_m_5.play();
                }
            skill_is = true;
            skill_timer = Date.now();
            }
            else {
                skill_m_5.stop();
                skill_is=false;
            }
        }

    }
}
function monster_show(){
      if(game_monster_arr.length<12){
                for(var i = game_monster_arr.length; i < 12 ; i++){
                     game_monster_image[i].setVisible(false);
                }
            }
            if(game_monster_arr.length>0){
                for(var i =0 ; i< game_monster_arr.length ; i++){
                    game_monster_image[i].setVisible(true);

                    game_monster_image[i].x = game_monster_arr[i][0];
                    game_monster_image[i].y = game_monster_arr[i][1];
                    game_monster_arr[i][1] += play_level.monster_speed+ (weight_power*play_level.monster_extra_speed/(weight_power+10000));
                    if(game_monster_arr[i][1] >= 1700){
                        spawn_expolosion(game_monster_image[i].x,game_monster_image[i].y);
                        game_monster_arr.splice(i, 1);

                        if(game_monster_arr.length>0){
                            for(var i =0 ; i< game_monster_arr.length ; i++){
                            game_monster_image[i].x = game_monster_arr[i][0];
                            game_monster_image[i].y = game_monster_arr[i][1];
                            }
                        }
                    }
                }
            }

}
function impact_animation(){
      if(break_impact_arr.length < 15){
                for(var i = break_impact_arr.length; i < 15 ; i++){
                     break_impact[i].setVisible(false);
                }
            }
            if(break_impact_arr.length>0){
                for(var i =0 ; i< break_impact_arr.length ; i++){
     
                    break_impact[i].setVisible(true);
                    break_impact_arr[i][0] += 1;
                    break_impact[i].x = break_impact_arr[i][1];
                    break_impact[i].y = break_impact_arr[i][2];
                    break_impact[i].setTexture('explosion_'+ break_impact_arr[i][0]);
                    if(break_impact_arr[i][0] >= 29){
                        break_impact_arr.splice(i, 1);
                        //spawn_monster.bind(this)();
                    }
                }
            }

            if(skill_izuna_impact.length < 10){
                for(var i = skill_izuna_impact.length; i < 10 ; i++){
                     skill_izuna_image[i].setVisible(false);
                }
            }
            if(skill_izuna_impact.length>0){
                for(var i =0 ; i< skill_izuna_impact.length ; i++){
                    skill_izuna_image[i].setVisible(true);
                    skill_izuna_image[i].x = skill_izuna_impact[i][1]; 
                    skill_izuna_image[i].y = skill_izuna_impact[i][2];
                    skill_izuna_image[i].setTexture('izuna_'+ skill_izuna_impact[i][0]);
                    skill_izuna_impact[i][0] += 1;
                    if(skill_izuna_impact[i][0] >= 18){
                        skill_izuna_impact.splice(i, 1);
                        //spawn_monster.bind(this)();
                    }
                }
            }
}

function update() { // update 함수
    skill_sound.bind(this)();
    if(point_down_button.length > 0){ // 애니메이션 실행될 버튼들이 있을경우 
        for(var i = 0; i<point_down_button.length;i++) // 모든 버튼 탐색
        {           
         if(animation_sec[i]>0 && animation_bool[i] == false ){ //줄어드는 버튼일경우
                animation_sec[i] -=1; //초 감소
                point_down_button[i].setScale(1); // setcale을 중복해서 사용할경우 곱연산이 됨으로 초기화
                point_down_button[i].setScale(1-(0.05 - animation_sec[i]/100)); // 크기 줄어듬
            }
            else if(animation_sec[i]>0 && animation_bool[i] == true ) // 복구되는 버튼일경우
            {
                animation_sec[i] -=1; //초감소
                point_down_button[i].setScale(1); //곱연산 방지
                point_down_button[i].setScale(1 - animation_sec[i]/100); // 크기복구
                if(animation_sec[i] <=0){ //만약 복구가 완료된 버튼일경우
                    point_down_button[i].setScale(1); // 한번더 확인사살 크기복구
                    if(point_down_button_isclick[i] == true){ // 만약 최근에 누른 버튼 맞다면? 
      
                        button_fun(point_down_button[i]); // 해당 버튼 코드 작동
                    }
                    point_down_button_isclick.splice(0,1); // 해당 배열 제거
                    animation_sec.splice(0,1); 
                    point_down_button.splice(0,1);
                    animation_bool.splice(0,1);
                    //use_button.splice(0,1);
                }
            }
        }
    }

    if(game_type =="in_game"){
        

        if(play_character.skill_gaze == 0 && aris_power == 0){
            skill_is = false;
        } 
        skill_gaze_text.setText(play_character.skill_gaze.toString() + '%');
        key_pc.bind(this)();
            //nonomi_skill();
            skill_show.bind(this)();
        
        if(ingame_type == "game")
        {
            if(character_choice_num == 3&&aris_skill_is == true&&play_character.skill_gaze > 0){
            aris_power +=1;
            play_character.skill_gaze -= 1;
            
            }
        if(game_drop_weapon.y < 1750 && game_drop_weapon_is == true){
            game_drop_weapon.y += 15;
        }
        else if(game_drop_weapon.y >= 1750 &&game_drop_weapon_is == true){
            spawn_expolosion(game_drop_weapon.x,game_drop_weapon.y);
            game_drop_weapon.setVisible(false);
            game_drop_weapon_is = false;
        }
        if(game_drop_score.y < 1750 && game_drop_score_is == true){
            game_drop_score.y += 15;
        }
        else if(game_drop_score.y >= 1750 &&game_drop_score_is == true){
            spawn_expolosion(game_drop_score.x,game_drop_score.y);
            game_drop_score.setVisible(false);
            game_drop_score_is = false;
        }

        if(game_drop_bomb.y < 1750 && game_drop_bomb_is == true){
            game_drop_bomb.y += (play_level.monster_speed+ (weight_power*play_level.monster_extra_speed/(weight_power+10000)))/2;
            if(game_drop_bomb.x < 40){
                bomb_drt = 1;
            }
            else if(game_drop_bomb.x > 1040){
                bomb_drt = -1;
            }
            game_drop_bomb.x += (bomb_drt * play_level.monster_speed+ (weight_power*play_level.monster_extra_speed/(weight_power+10000)))/2;
        }
        else if(game_drop_bomb.y >= 1750 &&game_drop_bomb_is == true){
            spawn_expolosion(game_drop_bomb.x,game_drop_bomb.y);
            game_drop_bomb.setVisible(false);
            game_drop_bomb_is = false;
        }
        if(game_drop_heart.y < 1750&&game_drop_heart_is == true){
            game_drop_heart.y += 15;
        }
        else if(game_drop_heart.y >= 1750&&game_drop_heart_is == true)
        {
            spawn_expolosion(game_drop_heart.x,game_drop_heart.y);
            game_drop_heart_is = false;
            game_drop_heart.setVisible(false);
        }
        if(motion_timer >475){
            skill_image.x += 20;
            motion_timer -= 1;
        }
        else if (motion_timer >250){
            motion_timer -= 1;
        }
        else if (motion_timer >0){
            motion_timer -= 1;
            skill_image.x -= 20;
        }
        else if(motion_timer <= 0 ){
            motion_timer = 0 ;
            skill_image.setVisible(false);
        }
        }



        if(ingame_type == "first"){
              warning_m.play();
            setting_level.bind(this)();
            setting_tier_score.bind(this)();
            cul_score.bind(this)(0);
            play_character.cx = 540;
            game_health_point = play_level.game_max_health;
            show_heart.bind(this)();

            timer = Date.now();
            ingame_type = "warning"; 
          
        }
        else if(ingame_type == "warning" && (Date.now() - timer)/1000 < 2) 
        {
            warning_image.setVisible(true);
            var pp = ((Date.now() - timer)/1000) ;
            if((Date.now() - timer)/1000 < 0.4){

               warning_image.setAlpha(0.4 - pp );
            }
            else if((Date.now() - timer)/1000 < 0.8){
                warning_image.setAlpha( pp -0.4); // 선명해졌다가 어두워짐
            }
            else if((Date.now() - timer)/1000 < 1.2){
               warning_image.setAlpha( 1.2- pp ); //다시 어두워졌다가 다시 등장
            }
            else if((Date.now() - timer)/1000 < 1.6){
               warning_image.setAlpha( pp -1.6);
            }
            else if((Date.now() - timer)/1000 < 1.6){
              warning_image.setAlpha( 2.0 - pp);
            }
            
            
        }
        else if(ingame_type == "warning" &&(Date.now() - timer)/1000 > 2)
            {

                warning_image.setVisible(false);
                spawn_monster.bind(this)();
                ingame_type = "game";
                timer = Date.now();
            }
        else if(ingame_type == "game"){
               if(text_color_time < 0){
                    game_score_text.setStyle({ fill: '#ff9999' });
                    text_color_time += 1;
                }
                else if(text_color_time > 0){
                    game_score_text.setStyle({ fill: '#99ff99' });
                    text_color_time -= 1;
        }
        else{
            game_score_text.setStyle({ fill: 'white' });
        }
            hit_time.bind(this)();
            collsize.bind(this)();
                
            game_score_text.setText(game_score);
            drop_obj.bind(this)();
            show_heart.bind(this)();
            unit_move.bind(this)();

            cul_score.bind(this)(1); 

        


            monster_show.bind(this)();

            impact_animation.bind(this)();


        }
    }
    else if(ingame_type == "die_first"){ 
            bgm_2.stop();
            const leaderboard = new Leaderboard();
            leaderboard.addScore(game_score, {
                character: character_choice_num + 1,
                level: level_type + 1,
            });
             // level_type 값 숫자로 각각 normal/hardcore/insane = 0,1,2  //  도움!
            //character_choice_num 값 각각 0,1,2,3,4,5 노노미 유우카 츠루기 아리스 이즈나 히나 
            //something   이미지가 1부터 시작하지만 여기 값은 0부터 시작함으로
            //  서버에 갱신할때 level_type + 1 과 character_choice_num +1로 넣으셔야 됩니다.  
            die_timer = 100;
            end_w.play();
            leader_show_surround.bind(this)();
            end_outbox.setAlpha(0);
            end_tier_image.setAlpha(0);
            end_share_button.setAlpha(0);
            end_replay_button.setAlpha(0);
            end_score_text.setAlpha(0);
            for(var i = 8 ; i <11 ;i++){
            reader_bg_image[i].setAlpha(0);
            reader_score_text[i].setAlpha(0);
            reader_rank_text[i].setAlpha(0);
            reader_level_image[i].setAlpha(0);
            reader_tier_image[i].setAlpha(0);
            reader_name_text[i].setAlpha(0);
            reader_character_image[i].setAlpha(0);
            }

            end_outbox.setAlpha(0);
            end_tier_image.setAlpha(0);
            end_share_button.setAlpha(0);
            end_replay_button.setAlpha(0);
            end_score_text.setAlpha(0);
            ingame_type = "die";
    }
    else if(ingame_type == "die"){
            if(die_timer > 0){
                die_timer --
            }
            for(var i = 8 ; i <11 ;i++){
            reader_bg_image[i].setAlpha((1 - die_timer / 100));
            reader_score_text[i].setAlpha((1 - die_timer / 100));
            reader_rank_text[i].setAlpha((1 - die_timer / 100));
            reader_level_image[i].setAlpha((1 - die_timer / 100));
            reader_tier_image[i].setAlpha((1 - die_timer / 100));
            reader_name_text[i].setAlpha((1 - die_timer / 100));
            reader_character_image[i].setAlpha((1 - die_timer / 100));
            }

            end_outbox.setAlpha(1 - die_timer / 100);
            end_tier_image.setAlpha(1 - die_timer / 100);
            end_share_button.setAlpha(1 - die_timer / 100);
            end_replay_button.setAlpha(1 - die_timer / 100);
            end_score_text.setAlpha(1 - die_timer / 100);
    }
}