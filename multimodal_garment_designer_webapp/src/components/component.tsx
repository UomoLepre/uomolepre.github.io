"use client";
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { alertService } from "@/services/alert.service";
import domtoimage from 'dom-to-image';
import Image from 'next/image';

// Spinner Component
function Spinner() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50">
      <span className="loader"></span>
      <p className="mt-8 text-white text-lg font-bold text-center p-2 rounded">We are sewing pixels to measure.... Your garment is almost ready!</p>
    {/*<div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>*/}
    </div>
  );
}

interface Sentences {
  [key: string]: string[];
}

export function Component() {
  // Initialize state with an empty array of textual inputs
  const [textualInputs, setTextualInput] = useState<string[]>(["", "", ""]);
  // addedInput is the value of the textarea. The function setAddedInput is used to update the value of the textarea.
  const [addedInput, setAddedInput] = useState<string>("");

  // State to manage the current image
  const [currentImage, setCurrentImage] = useState<string>("/assets/03191.jpg");

  // State to manage the visibility of the canvas
  const [showCanvas, setShowCanvas] = useState<boolean>(false);
  // Reference to the canvas and image
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  //State to manage model answer loading
  const [loading, setLoading] = useState(false);
  // State to manage drawing
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [canvasContext, setCanvasContext] = useState<CanvasRenderingContext2D | null>(null);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [savedDrawing, setSavedDrawing] = useState<ImageData | null>(null);

  // New state for stroke size
  const [strokeSize, setStrokeSize] = useState<number>(5);
  const [isErasing, setIsErasing] = useState(false);

  const toggleEraser = () => {
     setIsErasing(!isErasing); 
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      setCanvasContext(ctx);
      if (savedDrawing) {
        ctx!.putImageData(savedDrawing, 0, 0);
      }
    }
  }, [showCanvas, savedDrawing]);

  const getTouchPos = (canvasDom: HTMLCanvasElement, touchEvent: TouchEvent) => {
    const rect = canvasDom.getBoundingClientRect();
    const touch = touchEvent.touches[0];
    const scaleX = canvasDom.width / rect.width;
    const scaleY = canvasDom.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  };

  const handleToggleCanvas = () => {
    const canvas = canvasRef.current;
    if (showCanvas) {
      if (canvas) {
        canvas.classList.add('fade-out');
        setTimeout(() => {
          setShowCanvas(false);
          canvas.classList.remove('fade-out');
        }, 300); // Match the duration of the CSS transition
      }
    } else {
      setShowCanvas(true);
      if (canvas && savedDrawing) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.putImageData(savedDrawing, 0, 0);
        }
        canvas.classList.remove('fade-out');
      }
    }
  };

  const clearCanvas = () => {
    if (canvasContext) {
      canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
      setSavedDrawing(null); // Clear saved drawing as well
    }
  };

  // Update the function to handle Enter key press
  const handleTextareaKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default behavior (e.g., new line in textarea)
      handleAddTextualInputClick(); // Call the function to add the textual input
      setAddedInput("");
    }
  };

  // Event handler to add a new textual input
  const handleAddTextualInputClick = () => {
    // Trova il primo riquadro vuoto e aggiungi il testo lì
    const firstEmptyIndex = textualInputs.findIndex(input => input === "");
    
    if (firstEmptyIndex !== -1 && addedInput.trim()) {
      const newInputs = [...textualInputs];
      newInputs[firstEmptyIndex] = addedInput;
      setTextualInput(newInputs);
      setAddedInput(""); // Resetta il campo di input
    }
  };

  // Event handler to change the current image
  const handleImageChange = (newImage: string) => {
    setCurrentImage(newImage);
    setShowCanvas(false); // Hide canvas when image changes
    clearCanvas()
  }

  // Event handler to remove a textual input
  const handleRemoveTextualInput = (index: number) => {
    const newInputs = [...textualInputs];
    newInputs[index] = ""; // Svuota il riquadro selezionato
    setTextualInput(newInputs);
  };

  const handleGenerateDesign = () => {
    if (canvasRef.current) {
      console.log("canvas");
      if (textualInputs.length === 3){
        domtoimage.toJpeg(canvasRef.current, { quality: 0.95 })
          .then(async function (dataUrl) {
            const encodedImage = dataUrl.split(',')[1];
            const sentences: Sentences = {};
            const modelNumber = currentImage.split('/').pop()?.split('.')[0] || "Unknown Model";
  
            if (!sentences[modelNumber]) {
              sentences[modelNumber] = [...textualInputs];
            }
  
            let jsonData;

            if (modelNumber === '03191' || modelNumber === '12419') {
              jsonData = {
                "vitonhd": sentences,
                "image": encodedImage
              };
            } else if (modelNumber === '048462') {
              jsonData = {
                "dresscode": sentences,
                "image": encodedImage,
                "body_part": "upper_body"
              };
            } else if (modelNumber === '050915') {
              jsonData = {
                "dresscode": sentences,
                "image": encodedImage,
                "body_part": "lower_body"
              };
            } else if (modelNumber === '052012') {
              jsonData = {
                "dresscode": sentences,
                "image": encodedImage,
                "body_part": "dresses"
              };
            } else {
              console.error('Model number not recognized:', modelNumber);
              alertService.error('Error : Unrecognized model number');
              setLoading(false);
              return;
            }
  
            try {
              setLoading(true);
  
              const response = await fetch('https://capagio-garment-designer.hf.space/generate-design', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonData),
              });
  
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
  
              // Aggiorna l'URL dell'immagine generata
              setGeneratedImageUrl(url);
  
              // Aggiorna l'immagine visualizzata
              const latestDesignImg = document.querySelector('img[alt="Latest Generated Design"]') as HTMLImageElement;
              if (latestDesignImg) {
                latestDesignImg.src = url;
              }
            } catch (error) {
              console.error('Errore nella generazione del design:', error);
            } finally {
              setLoading(false);
            }
          })
          .catch(function (error) {
            console.error('Errore nella generazione del design:', error);
          });
      } else {
        alertService.error('Error : Exactly three textual inputs must be inserted to generate a dress')
      }
    } else {
      alertService.error('Error : Cannot generate image if no canvas has been edited')
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if(canvasContext){
      setIsDrawing(true);
      const rect = canvasRef.current!.getBoundingClientRect();
      const scaleX = canvasRef.current!.width / rect.width;
      const scaleY = canvasRef.current!.height / rect.height;

      if (isErasing) {
        canvasContext.globalCompositeOperation = 'destination-out'; // Attiva modalità gomma
      } else {
        canvasContext.globalCompositeOperation = 'source-over'; // Modalità normale per disegno
      }

      drawPoint((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY )
      setLastPosition({
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      });
  }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const currentPosition = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    if (canvasContext) {
      canvasContext.beginPath();
      canvasContext.moveTo(lastPosition.x, lastPosition.y);
      canvasContext.lineTo(currentPosition.x, currentPosition.y);
      canvasContext.strokeStyle = "white";
      canvasContext.lineWidth = strokeSize;
      canvasContext.stroke();
      setLastPosition(currentPosition);
    }
  };
  
  const handleMouseUp = () => {
    setIsDrawing(false);
    if (canvasContext && canvasRef.current) {
      const ctx = canvasContext;
      const drawing = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      setSavedDrawing(drawing);
    }
  };
  
  
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if(canvasContext){
      disableScroll();
      setIsDrawing(true);
      if (isErasing) {
        canvasContext.globalCompositeOperation = 'destination-out'; // Attiva modalità gomma
      } else {
        canvasContext.globalCompositeOperation = 'source-over'; // Modalità normale per disegno
      }
      const pos = getTouchPos(canvasRef.current!, e.nativeEvent);
      setLastPosition(pos);
    }
    
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent default touch behavior (scrolling)
    const pos = getTouchPos(canvasRef.current!, e.nativeEvent);
    draw(pos);
  };

  const handleTouchEnd = () => {
    enableScroll();
    setIsDrawing(false);
    saveDrawing();
  };

  const drawPoint = (x:number, y:number) => {
    
    if (canvasContext){
      canvasContext.lineWidth = strokeSize;  // Set stroke size dynamically
      canvasContext.strokeStyle = "white";
      //canvasContext.beginPath();
      canvasContext.moveTo(x, y);
      canvasContext.lineTo(x+1, y+1);
      console.log("oh");
      canvasContext.stroke();
    }
  };

  const draw = (currentPosition: { x: number; y: number }) => {
    if (canvasContext) {
      canvasContext.beginPath();
      canvasContext.moveTo(lastPosition.x, lastPosition.y);
      canvasContext.lineTo(currentPosition.x, currentPosition.y);
      canvasContext.strokeStyle = "white";
      canvasContext.lineWidth = strokeSize;
      canvasContext.stroke();
      setLastPosition(currentPosition);
    }
  };

  const saveDrawing = () => {
    if (canvasContext && canvasRef.current) {
      const ctx = canvasContext;
      const drawing = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      setSavedDrawing(drawing);
    }
  };

  const disableScroll = () => {
    document.body.style.overflow = 'hidden';
  };
  
  const enableScroll = () => {
    document.body.style.overflow = 'auto';
  };

  return (
    
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 dark:bg-gray-950 p-4 md:p-8">
      
    <div className="max-w-4xl w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
      <div className="grid md:grid-cols-2">
        <div className="relative flex items-center justify-center bg-gray-800 dark:bg-gray-800 p-8">
            <div className="relative" ref={imgRef} style={{marginBottom: '70%'}}>
              <Image
                alt="Model"
                className={`max-w-full h-auto rounded-lg ${showCanvas ? 'faded' : ''}`} // Apply faded class conditionally
                height={1024}
                src={currentImage}
                width={768}
                onLoadingComplete={() => {
                  if (canvasRef.current && imgRef.current) {
                    const canvas = canvasRef.current;
                    const img = imgRef.current;
                    canvas.width = img.clientWidth;
                    canvas.height = img.clientHeight;
                  }
                }}
              />
              {showCanvas && (
                <canvas
                ref={canvasRef}
                id="design-canvas"
                className={`absolute top-0 left-0 w-full h-full rounded-lg ${!showCanvas ? 'fade-out' : ''}`}
                style={{ display: showCanvas ? 'block' : 'none', touchAction: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                //onTouchStart={handleTouchStart}
                //onTouchMove={handleTouchMove}
                //onTouchEnd={handleTouchEnd}
                onPointerDown={handleMouseDown}
                onPointerUp={handleMouseUp}
                onPointerMove={handleMouseMove}
                />
              )}
            </div>
            
            {showCanvas && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex flex-row items-center" style={{marginBottom: '50%'}}>
              <div>
                <Label htmlFor="strokeSize" className="text-white">Stroke Size: {strokeSize}px</Label>
                <input
                  type="range"
                  id="strokeSize"
                  min="1"
                  max="20"
                  value={strokeSize}
                  onChange={(e) => setStrokeSize(Number(e.target.value))}
                  className="w-40"
                />
              </div>
              <div>
                
                <button 
                  onClick={toggleEraser} 
                  style={{ 
                      margin: '20%',
                      cursor: 'pointer',
                      border: isErasing ? '2px solid white' : 'none',
                      backgroundColor: isErasing ? '#8f9296' : 'transparent',
                      padding: '5px', 
                  }}>
                  <img src="/assets/icons/eraser.png" alt="buttonpng"  />
                </button>
              </div>
            </div>
            )}

            <div>
              <div className="absolute bottom-4 right-9 flex items-center gap-2" style={{marginBottom: '50%'}}>
                <Button size="icon" variant="outline" onClick={() => handleImageChange("/assets/03191.jpg")}>
                  <img
                    alt="03191"
                    className="rounded-md"
                    height={50}
                    src="/assets/03191.jpg"
                    style={{
                      aspectRatio: "40/50",
                      objectFit: "cover",
                    }}
                    width={40}
                  />
                </Button>
                <Button size="icon" variant="outline" onClick={() => handleImageChange("/assets/12419.jpg")}>
                  <img
                    alt="12419"
                    className="rounded-md"
                    height={50}
                    src="/assets/12419.jpg"
                    style={{
                      aspectRatio: "40/50",
                      objectFit: "cover",
                    }}
                    width={40}
                  />
                </Button>
                <Button size="icon" variant="outline" onClick={() => handleImageChange("/assets/048462.jpg")}>
                  <img
                    alt="048462"
                    className="rounded-md"
                    height={50}
                    src="/assets/048462.jpg"
                    style={{
                      aspectRatio: "40/50",
                      objectFit: "cover",
                    }}
                    width={40}
                  />
                </Button>
                <Button size="icon" variant="outline" onClick={() => handleImageChange("/assets/050915.jpg")}>
                  <img
                    alt="050915"
                    className="rounded-md"
                    height={50}
                    src="/assets/050915.jpg"
                    style={{
                      aspectRatio: "40/50",
                      objectFit: "cover",
                    }}
                    width={40}
                  />
                </Button>
                <Button size="icon" variant="outline" onClick={() => handleImageChange("/assets/052012.jpg")}>
                  <img
                    alt="052012"
                    className="rounded-md"
                    height={50}
                    src="/assets/052012.jpg"
                    style={{
                      aspectRatio: "40/50",
                      objectFit: "cover",
                    }}
                    width={40}
                  />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-8 space-y-6" style={{backgroundColor: '#111827'}}>
          <h1 className="text-3xl font-bold" style={{color: 'white'}}>Draw your design!</h1>
            <div className="space-y-4 flex flex-col">
              <div>
                <div className="relative">
                {textualInputs.filter(item => item !== "").length < 3 && (
                  <div>   
                  <Textarea
                    className="w-full pr-12 notresizable"
                    id="text"
                    value={addedInput}
                    onChange={(e) => setAddedInput(e.target.value)}
                    onKeyPress={handleTextareaKeyPress}
                    placeholder="Describe fabric, color, or distinct characteristics..."
                    rows={3}
                  />
                  
                  <Button
                  className="absolute top-1/2 -translate-y-1/2 right-3"
                  size="icon"
                  variant="outline"
                  onClick={handleAddTextualInputClick}
                >
                <PlusIcon className="w-5 h-5" />
                </Button>
                </div>
                )}
                {textualInputs.filter(item => item !== "").length >= 3 && (
                  <div>   
                  <Textarea
                    className="w-full pr-12 notresizable"
                    id="text"
                    value={addedInput}
                    onChange={(e) => setAddedInput(e.target.value)}
                    onKeyPress={handleTextareaKeyPress}
                    placeholder="You have reached the text input limit. Delete one to add another"
                    rows={3}
                    disabled
                  />
                </div>
                )}
                
              </div>
              </div>
              <div className="balloon-container space-y-2 flex flex-col">
  {textualInputs.map((text, index) => {
    const placeholders = [
      "Color red",
      "Long sleeves shirt",
      "Single color"
    ];

    
    const displayText = text || placeholders[index % placeholders.length];

    return (
      <div
        key={index}
        className="rounded-lg p-3 flex items-center justify-between mb-2"
        style={{
          height: '50px',
          backgroundColor: text ? 'white' : '#e0e0e0',
          opacity: text ? '1' : '0.5',
        }}
      >
        <span style={{ fontStyle: text ? 'normal' : 'italic' }}>
          {displayText}
        </span>
        {text && (
          <Button
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            size="icon"
            variant="outline"
            onClick={() => handleRemoveTextualInput(index)}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  })}
</div>
              <div>
                <Label style={{textAlign: 'center', display: 'block', color: 'white'}} >Draw on the Model</Label>
                <div className="flex items-center justify-center" style={{marginTop: '10px'}}>
                  <Button className="mr-2" size="icon" variant="outline" onClick={handleToggleCanvas}>
                    <PencilIcon className="w-5 h-5" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={clearCanvas}>
                    <TrashIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="balloon-container space-y-2" />
            <Button className="w-full"   style={{
                                    backgroundColor: 'black',
                                    color: 'white',
                                    width: '100%',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'blue';
                                    e.currentTarget.style.color = 'white';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'black';
                                    e.currentTarget.style.color = 'white';
                                  }} onClick={handleGenerateDesign}>
               Generate Design</Button>
            
            {/*loading && <Spinner />*/}
            {loading && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <Spinner />
              </div>
            )}
            <div className="flex items-center justify-center">
              <img
                alt="Latest Generated Design"
                className="rounded-lg"
                height={375}
                src="/placeholder.svg"
                style={{
                  aspectRatio: "300/375",
                  objectFit: "cover",
                }}
                width={300}
              />
            </div>
            {generatedImageUrl && (
              <a
              href={generatedImageUrl}
              download="generated_design.jpeg"
              className="mt-4 w-full inline-block text-center bg-blue-500 text-white font-bold py-2 px-4 rounded"
              style={{
                backgroundColor: 'blue', 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'blue';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'black';
                e.currentTarget.style.color = 'white';
              }}>
              Download Design
            </a>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
