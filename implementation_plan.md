# Add Video After Pipeline Animation Completion

This plan outlines the steps to display a video automatically once the `PipelineDiagram` finishes its "Report" stage animation on the landing page.

## User Review Required

> [!IMPORTANT]
> The animation currently loops infinitely. To show a video *after* it's done, I propose we stop the loop once it reaches the end, and transition to showing the video. Please confirm if this is the desired behavior or if the animation should keep looping in the background.

## Open Questions

> [!WARNING]
> 1. **Video Source**: What video should we display? Do you have a local video file (e.g., in the `public` folder), a YouTube/Vimeo link, or should I use a placeholder video for now?
> 2. **UI Placement**: Should the video replace the pipeline diagram, overlay on top of it, or appear next to/below it?

## Proposed Changes

### `e:\AeroGuard\client\Frontend\Aero frontend\aeroguard\src\app\page.tsx`

#### [MODIFY] `page.tsx`
- **Update State Management**: 
  - Change the `useEffect` interval logic in `PipelineDiagram` to stop advancing `activeStage` when it reaches the last item (`stages.length - 1`), instead of looping back to `0`.
  - Add a new state variable (e.g., `const [showVideo, setShowVideo] = useState(false)`) that triggers when the final stage completes.
- **UI Updates**:
  - Render a `<video>` tag (or iframe if external) when `showVideo` is true.
  - Implement smooth Framer Motion transitions (e.g., fading out the pipeline list and fading in the video player).
  - Add controls to the video (play, pause, volume) and consider autoplaying it once revealed.

## Verification Plan

### Manual Verification
- Start the frontend server (`npm run dev`).
- Open the landing page (`http://localhost:3000`).
- Wait for the pipeline animation stages to complete (approx. 12 seconds).
- Verify the video appears with a smooth transition and is playable.
