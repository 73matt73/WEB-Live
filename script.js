const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const videoContainer = document.getElementById('videoContainer');

const EMOTIONS_UKR = {
    angry: 'Злість',
    disgusted: 'Огида',
    fearful: 'Страх',
    happy: 'Радість',
    sad: 'Сум',
    surprised: 'Здивування',
    neutral: 'Нейтрально'
};

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('models'),
    faceapi.nets.faceExpressionNet.loadFromUri('models'),
    faceapi.nets.ageGenderNet.loadFromUri('models')
]).then(startVideo).catch(err => {
    statusDiv.innerText = "Помилка завантаження моделей.";
    statusDiv.style.backgroundColor = "#fee2e2";
    statusDiv.style.color = "#991b1b";
});

function startVideo() {
    statusDiv.innerText = "Надайте доступ до камери...";
    statusDiv.style.backgroundColor = "#d1fae5";
    statusDiv.style.color = "#065f46";

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user"
        }
    })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => {
        statusDiv.innerText = "Не вдалося отримати доступ до камери.";
    });
}

video.addEventListener('playing', () => {
    statusDiv.innerText = "Камера активна. Аналіз запущено!";

    const canvas = faceapi.createCanvasFromMedia(video);
    videoContainer.append(canvas);

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const ctx = canvas.getContext('2d');

    setInterval(async () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        if (displaySize.width !== video.videoWidth || displaySize.height !== video.videoHeight) {
            displaySize.width = video.videoWidth;
            displaySize.height = video.videoHeight;
            faceapi.matchDimensions(canvas, displaySize);
        }

        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions()
            .withAgeAndGender();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        resizedDetections.forEach(detection => {
            const box = detection.detection.box;

            const mirroredX = displaySize.width - box.x - box.width;

            const expressions = detection.expressions;
            const dominantEmotion = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
            const emotionUkr = EMOTIONS_UKR[dominantEmotion] || dominantEmotion;

            const genderUkr = detection.gender === 'male' ? 'Чоловік' : 'Жінка';
            const age = Math.round(detection.age);

            const text = `${genderUkr}, ${age} років, ${emotionUkr}`;

            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(mirroredX, box.y, box.width, box.height);

            ctx.font = 'bold 16px Arial';
            const textWidth = ctx.measureText(text).width;
            const textHeight = 16;
            const padding = 6;

            let bgX = mirroredX;
            let bgY = box.y - textHeight - padding * 2;

            if (bgY < 0) {
                bgY = box.y + box.height;
            }

            if (bgX + textWidth + padding * 2 > displaySize.width) {
                bgX = displaySize.width - textWidth - padding * 2;
                if (bgX < 0) bgX = 0;
            }

            ctx.fillStyle = '#00ff00';
            ctx.fillRect(bgX, bgY, textWidth + padding * 2, textHeight + padding * 2);

            ctx.fillStyle = '#000000';
            ctx.fillText(text, bgX + padding, bgY + textHeight + padding / 2);
        });
    }, 100);
});
