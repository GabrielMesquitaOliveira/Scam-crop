class Util {
    constructor(errorOutputId) {
        let self = this;
        this.errorOutput = document.getElementById(errorOutputId);

        this.createFileFromUrl = function (path, url, callback) {
            let request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.responseType = "arraybuffer";
            request.onload = function (ev) {
                if (request.readyState === 4) {
                    if (request.status === 200) {
                        let data = new Uint8Array(request.response);
                        cv.FS_createDataFile("/", path, data, true, false, false);
                        callback();
                    } else {
                        self.printError("Failed to load " + url + " status: " + request.status);
                    }
                }
            };
            request.send();
        };

        // esta função é usada para carregar uma imagem para um canvas a partir de uma url e um id
        // reposavel por renderizar a imagem no canvas com a perpectiva correta
        this.loadImageToCanvas = function (url, cavansId) {
            let canvas = document.getElementById(cavansId);
            let ctx = canvas.getContext("2d");
            let img = new Image();
            //img.crossOrigin = 'anonymous';
            img.onload = function () {
                /*canvas.width = 300;
                canvas.height = 400;*/
                //canvas resultado
                canvas.width = img.width;
                canvas.height = img.height;
                //ctx.drawImage(img, 0, 0, 300, 400);
                // pontos de origem do plano cartesiano
                ctx.drawImage(img, 0, 0, img.width, img.height);
            };
            img.src = url;
        };

        this.executeCode = function (textAreaId) {
            try {
                this.clearError();
                let code = document.getElementById(textAreaId).value;
                eval(code);
            } catch (err) {
                this.printError(err);
            }
        };

        this.clearError = function () {
            this.errorOutput.innerHTML = "";
        };

        this.printError = function (err) {
            if (typeof err === "undefined") {
                err = "";
            } else if (typeof err === "number") {
                if (!isNaN(err)) {
                    if (typeof cv !== "undefined") {
                        err = "Exception: " + cv.exceptionFromPtr(err).msg;
                    }
                }
            } else if (typeof err === "string") {
                let ptr = Number(err.split(" ")[0]);
                if (!isNaN(ptr)) {
                    if (typeof cv !== "undefined") {
                        err = "Exception: " + cv.exceptionFromPtr(ptr).msg;
                    }
                }
            } else if (err instanceof Error) {
                err = err.stack.replace(/\n/g, "<br>");
            }
            this.errorOutput.innerHTML = err;
        };

        this.loadCode = function (scriptId, textAreaId) {
            /*let scriptNode = document.getElementById(scriptId);
            let textArea = document.getElementById(textAreaId);
            if (scriptNode.type !== 'text/code-snippet') {
                throw Error('Unknown code snippet type');
            }
            textArea.value = scriptNode.text.replace(/^\n/, '');*/
        };

        //esta funcao é responsavel por carregar a imagem no canvas a partir de um input, atualmente não está sendo usada
        this.addFileInputHandler = function (fileInputId, canvasId) {
            let inputElement = document.getElementById(fileInputId);
            inputElement.addEventListener(
                "change",
                (e) => {
                    let files = e.target.files;
                    if (files.length > 0) {
                        let imgUrl = URL.createObjectURL(files[0]);
                        self.loadImageToCanvas(imgUrl, canvasId);
                    }
                },
                false
            );
        };

        function onVideoCanPlay() {
            if (self.onCameraStartedCallback) {
                self.onCameraStartedCallback(self.stream, self.video);
            }
        }

        this.startCamera = function (resolution, callback, videoId) {
            const constraints = {
                qvga: { width: { exact: 320 }, height: { exact: 240 } },
                vga: { width: { exact: 640 }, height: { exact: 480 } },
            };
            let video = document.getElementById(videoId);
            if (!video) {
                video = document.createElement("video");
            }

            let videoConstraint = constraints[resolution];
            if (!videoConstraint) {
                videoConstraint = true;
            }

            navigator.mediaDevices
                .getUserMedia({ video: videoConstraint, audio: false })
                .then(function (stream) {
                    video.srcObject = stream;
                    video.play();
                    self.video = video;
                    self.stream = stream;
                    self.onCameraStartedCallback = callback;
                    video.addEventListener("canplay", onVideoCanPlay, false);
                })
                .catch(function (err) {
                    self.printError("Camera Error: " + err.name + " " + err.message);
                });
        };

        this.stopCamera = function () {
            if (this.video) {
                this.video.pause();
                this.video.srcObject = null;
                this.video.removeEventListener("canplay", onVideoCanPlay);
            }
            if (this.stream) {
                this.stream.getVideoTracks()[0].stop();
            }
        };
    }
}

function main() {
    var destroygrid = function () {
        d3.select("#background").selectAll("svg").remove();
        d3.select("#background").selectAll("button").remove();
        d3.select("#background").selectAll("div").remove();
    };

    destroygrid();

    // função para transoformas a escala da div com transform:scale(X) de crop para se adequar ao layout
    function resizeDiv() {
        var cropDiv = $("#crop-div").width();
        var backGroundWidth = $("#background").width();
        var backGround = $("#background");
        var escala = cropDiv / backGroundWidth;
        backGround.css("transform", "scale(" + escala + ")");
        var cropDivHeight = $("#background").height() * escala;
        $("#crop-div").css("height", cropDivHeight + "px");

        setTimeout(() => {
            var strokeWidth = 5 / escala;
            $(".handle").css("stroke-width", strokeWidth + "vh");
        }, 100);
    }

    resizeDiv();

    const util = new Util("errorMessage");
    const imageUsed = document.getElementById("sample").getAttribute("src");
    const applyButton = document.getElementById("apply");
    const submitButton = document.getElementById("submit");
    const undoButton = document.getElementById("undo");

    const setUpApplyButton = function () {
        applyButton.style.display = "none";

        var newLottiePlayer = document.createElement("lottie-player");
        newLottiePlayer.src = "https://assets7.lottiefiles.com/private_files/lf30_4kmk2efh.json";
        newLottiePlayer.background = "transparent";
        newLottiePlayer.speed = "2";
        newLottiePlayer.style.width = "auto";
        newLottiePlayer.style.height = "85vh";
        newLottiePlayer.loop = true;
        newLottiePlayer.autoplay = true;

        document.getElementById("crop-div").style.display = "none";
        document.getElementById("imageResult").style.display = "none";

        var resultimg = document.getElementById("result_img");
        resultimg.appendChild(newLottiePlayer);
        //append de texto de carregamento com cor preta
        var newDiv = document.createElement("div");
        newDiv.innerHTML = "Ajustando...";
        newDiv.style.textAlign = "center";
        newDiv.style.fontSize = "1rem";
        newDiv.style.fontWeight = "bold";
        newDiv.style.color = "black";
        newDiv.style.marginTop = "1rem";
        newDiv.style.marginBottom = "1rem";
        resultimg.appendChild(newDiv);

        // função que pega os pontos do svg e transforma em um array de pontos que será usado para o warpPerspective
        let pointsArray = [];
        const children = document.querySelectorAll("#window_g .handle");
        children.forEach((e) => {
            const pos = e.getAttribute("transform");
            console.dir(pos);
            const point = pos.replace("translate(", "").replace(")", "").split(",");
            pointsArray.push(point[0]);
            pointsArray.push(point[1]);
        });

        // função que carrega a imagem no canvas e aplica o warpPerspective
        util.loadImageToCanvas(imageUsed, "imageInit");
        setTimeout(() => {
            let src = cv.imread("imageInit");
            const imageHeight = document.getElementById("imageInit").height;
            const imageWidth = document.getElementById("imageInit").width;
            const svgCropHeight =
                document.querySelector("#background svg").getAttribute("height") - 80;
            const svgCropWidth =
                document.querySelector("#background svg").getAttribute("width") - 80;
            // escala para o warpPerspective Muito importante!!!

            const scaleFactor = parseInt(imageWidth / svgCropWidth);
            // a imagem é redimensionada para o tamanho do svg, então é preciso calcular a escala para que o warpPerspective funcione corretamente, isso funciona como correção devido a diferença de tamanho entre a imagem e o svg, graças ao margim que foi adicionado ao svg
            pointsArray = pointsArray.map((e) => {
                const num = parseInt((parseInt(e) + 160) / scaleFactor);
                return num;
            });

            setTimeout(() => {
                let dst = new cv.Mat();
                // tamanho do quadrado que será o resultado do warpPerspective, maximo é o tamanho da imagem
                let dsize = new cv.Size(1748, 2480);
                let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, pointsArray);
                // calculo dos vertices do quadrado que será o resultado do warpPerspective, se define os pontos 0 do plano cartesianos e os pontos do quadrado de resultado
                let dstTri = cv.matFromArray(
                    4,
                    1,
                    cv.CV_32FC2,
                    [0, 0, 1748, 0, 1748, 2480, 0, 2480]
                );
                let M = cv.getPerspectiveTransform(srcTri, dstTri);
                // metodo de transformação, neste caso o warpPerspective ele recebe a imagem, o resultado, a matriz de transformação, o tamanho do quadrado de resultado, o metodo de interpolação e o metodo de borda
                cv.warpPerspective(
                    src,
                    dst,
                    M,
                    dsize,
                    cv.INTER_LINEAR,
                    cv.BORDER_CONSTANT,
                    new cv.Scalar()
                );
                cv.imshow("imageResult", dst);
                src.delete();
                dst.delete();
                M.delete();
                srcTri.delete();
                dstTri.delete();
            }, 2000);
            setTimeout(() => {
                resultimg.removeChild(newLottiePlayer);
                document.getElementById("imageResult").style.display = "block";
                submitButton.style.display = "block";
                undoButton.style.display = "block";
                resultimg.removeChild(newDiv);
            }, 2100);
        }, 500);
    };

    applyButton.setAttribute("disabled", "true");
    applyButton.onclick = setUpApplyButton;

    function cvOpen() {
        setTimeout(function () {
            applyButton.removeAttribute("disabled");
        }, 500);
    }
    cvOpen();
    const attachCropBox = function (imgWidth, imgHeight) {
        var margin = { top: 160, right: 160, bottom: 160, left: 160 },
            width = imgWidth - margin.left - margin.right,
            height = imgHeight - margin.top - margin.bottom;

        var sourcePoints = [
                [0, 0],
                [width, 0],
                [width, height],
                [0, height],
            ],
            targetPoints = [
                [0, 0],
                [width, 0],
                [width, height],
                [0, height],
            ];

        var svg = d3
            .select("#background")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("class", "grid")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("id", "window_g");

        var line = svg
            .selectAll(".line")
            .data(
                d3
                    .range(0, width + 1, 160)
                    .map(function (x) {
                        return [
                            [x, 0],
                            [x, height],
                        ];
                    })
                    .concat(
                        d3.range(0, height + 1, 160).map(function (y) {
                            return [
                                [0, y],
                                [width, y],
                            ];
                        })
                    )
            )
            .enter()
            .append("path")
            .attr("class", "line line--x");

        var handle = svg
            .selectAll(".handle")
            .data(targetPoints)
            .enter()
            .append("circle")
            .attr("class", "handle")
            .attr("transform", function (d) {
                return "translate(" + d + ")";
            })
            .attr("r", 7)
            .call(
                d3.behavior
                    .drag()
                    .origin(function (d) {
                        return { x: d[0], y: d[1] };
                    })
                    .on("drag", dragged)
                    .on("dragend", dragEnd)
            );

        d3.selectAll("button")
            .datum(function (d) {
                return JSON.parse(this.getAttribute("data-targets"));
            })
            .on("click", clicked)
            .call(transformed);

        function clicked(d) {
            d3.transition()
                .duration(750)
                .tween("points", function () {
                    if (!(d == null)) {
                        var i = d3.interpolate(targetPoints, d);
                        return function (t) {
                            handle.data((targetPoints = i(t))).attr("transform", function (d) {
                                return "translate(" + d + ")";
                            });
                            transformed();
                        };
                    }
                });
        }

        function dragged(d) {
            document.getElementById("crop").style.overflowY = "hidden";
            document.getElementById("crop").style.overflowX = "hidden";
            d3.select(this).attr(
                "transform",
                "translate(" + (d[0] = d3.event.x) + "," + (d[1] = d3.event.y) + ")"
            );
            transformed();
        }

        function dragEnd() {
            document.getElementById("crop").style.overflowY = "auto";
        }

        function transformed() {
            for (var a = [], b = [], i = 0, n = sourcePoints.length; i < n; ++i) {
                var s = sourcePoints[i],
                    t = targetPoints[i];
                a.push([s[0], s[1], 1, 0, 0, 0, -s[0] * t[0], -s[1] * t[0]]), b.push(t[0]);
                a.push([0, 0, 0, s[0], s[1], 1, -s[0] * t[1], -s[1] * t[1]]), b.push(t[1]);
            }

            var X = solve(a, b, true),
                matrix = [
                    X[0],
                    X[3],
                    0,
                    X[6],
                    X[1],
                    X[4],
                    0,
                    X[7],
                    0,
                    0,
                    1,
                    0,
                    X[2],
                    X[5],
                    0,
                    1,
                ].map(function (x) {
                    return d3.round(x, 6);
                });

            line.attr("d", function (d) {
                return "M" + project(matrix, d[0]) + "L" + project(matrix, d[1]);
            });
        }
        function project(matrix, point) {
            point = multiply(matrix, [point[0], point[1], 0, 1]);
            return [point[0] / point[3], point[1] / point[3]];
        }

        function multiply(matrix, vector) {
            return [
                matrix[0] * vector[0] +
                    matrix[4] * vector[1] +
                    matrix[8] * vector[2] +
                    matrix[12] * vector[3],
                matrix[1] * vector[0] +
                    matrix[5] * vector[1] +
                    matrix[9] * vector[2] +
                    matrix[13] * vector[3],
                matrix[2] * vector[0] +
                    matrix[6] * vector[1] +
                    matrix[10] * vector[2] +
                    matrix[14] * vector[3],
                matrix[3] * vector[0] +
                    matrix[7] * vector[1] +
                    matrix[11] * vector[2] +
                    matrix[15] * vector[3],
            ];
        }
    };

    var loadgrid = function () {
        var img = new Image();
        img.onload = function () {
            const imgWidth = img.width;
            const imgHeight = img.height;
            attachCropBox(imgWidth, imgHeight);
        };
        //img
        img.src = imageUsed;
    };

    loadgrid();
}
